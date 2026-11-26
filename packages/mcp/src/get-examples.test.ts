/** @vitest-environment node */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'

import { type GhostvueStamp } from './contract.js'
import { type ToolErrorEnvelope } from './errors.js'
import { createGetExamplesTool } from './get-examples.js'
import { createGhostvueServer } from './server.js'
import { type GhostvueTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'c'.repeat(64)}`,
  manifestSchemaId: 'https://ghostvue.dev/schemas/v1/manifest.schema.json',
}

function fixtureDirectory(name: string): URL {
  return new URL(`../test/fixtures/${name}/`, import.meta.url)
}

const fixtureTool = createGetExamplesTool({
  assetsDirectory: fixtureDirectory('assets'),
})

const buttonBasic = {
  id: 'button/basic',
  title: 'Basic',
  description: 'Unstyled button.',
  layer: 'headless',
  sourcePath: 'examples/button/basic.vue',
}

const clients: Client[] = []
let logged: string[] = []

afterEach(async () => {
  logged = []
  await Promise.all(clients.splice(0).map((client) => client.close()))
})

/**
 * Calls through a real SDK client so every success payload is also checked
 * against the advertised outputSchema, as an MCP host would check it.
 */
async function callTool(
  args?: Record<string, unknown>,
  options: { tool?: GhostvueTool; stamp?: GhostvueStamp } = {},
): Promise<CallToolResult> {
  const server = createGhostvueServer({
    stamp: options.stamp ?? stamp,
    tools: [options.tool ?? fixtureTool],
    log: (line) => logged.push(line),
  })
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  clients.push(client)
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  // listTools caches the outputSchema the client validates results against.
  await client.listTools()
  const result = await client.callTool({
    name: 'get_examples',
    arguments: args,
  })
  return result as CallToolResult
}

interface ExamplesPage {
  examples: { id: string; source?: string }[]
  nextCursor: string | null
}

function pageOf(result: CallToolResult): ExamplesPage {
  expect(result.isError).toBeUndefined()
  return result.structuredContent as unknown as ExamplesPage
}

function idsOf(result: CallToolResult): unknown[] {
  return pageOf(result).examples.map((example) => example.id)
}

function envelopeOf(result: CallToolResult): ToolErrorEnvelope {
  expect(result.isError).toBe(true)
  const [block] = result.content
  if (block?.type !== 'text') throw new Error('expected a text error block')
  return JSON.parse(block.text) as ToolErrorEnvelope
}

describe('get_examples', () => {
  it('advertises the §5.3 inputs and defaults', () => {
    const { inputSchema, outputSchema, annotations } = fixtureTool.descriptor

    expect(inputSchema.properties).toMatchObject({
      id: { type: 'string' },
      component: { type: 'string' },
      layer: { enum: ['headless', 'themed'] },
      includeSource: { type: 'boolean', default: true },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      cursor: { type: 'string' },
      expectedGhostvueVersion: { type: 'string' },
    })
    expect(inputSchema.required ?? []).toEqual([])
    expect(outputSchema?.required).toEqual(
      expect.arrayContaining([
        'schemaVersion',
        'ghostvue',
        'examples',
        'nextCursor',
      ]),
    )
    expect(annotations).toMatchObject({ readOnlyHint: true })
  })

  it('returns one example by id with its source', async () => {
    const result = await callTool({ id: 'button/basic' })

    expect(result.structuredContent).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
      examples: [
        {
          ...buttonBasic,
          source: '<template>\n  <p>button/basic</p>\n</template>\n',
        },
      ],
      nextCursor: null,
    })
    expect(result.content).toEqual([
      { type: 'text', text: '1 of 1 example button/basic with source.' },
    ])
  })

  it('omits source when includeSource is false', async () => {
    const result = await callTool({ id: 'button/basic', includeSource: false })

    expect(pageOf(result).examples).toEqual([buttonBasic])
  })

  it('lists catalog metadata without source when neither id nor component is given (M2)', async () => {
    const result = await callTool({ includeSource: true })

    expect(idsOf(result)).toEqual([
      'button/basic',
      'button/icon-only',
      'button/themed',
      'button-group/basic',
      'dialog/basic',
    ])
    for (const example of pageOf(result).examples) {
      expect(example).not.toHaveProperty('source')
    }
    expect(pageOf(result).nextCursor).toBeNull()
  })

  it('accepts a call with no arguments object at all', async () => {
    const result = await callTool(undefined)

    expect(idsOf(result)).toHaveLength(5)
  })

  it('returns every example under a component with source, in catalog order', async () => {
    const result = await callTool({ component: 'button' })

    // `button-group/basic` shares the text prefix but not the directory.
    expect(idsOf(result)).toEqual([
      'button/basic',
      'button/icon-only',
      'button/themed',
    ])
    for (const example of pageOf(result).examples) {
      expect(example.source).toBe(
        `<template>\n  <p>${example.id}</p>\n</template>\n`,
      )
    }
  })

  it('filters by layer', async () => {
    const themed = await callTool({ component: 'button', layer: 'themed' })
    const headless = await callTool({ layer: 'headless' })

    expect(idsOf(themed)).toEqual(['button/themed'])
    expect(idsOf(headless)).toEqual([
      'button/basic',
      'button/icon-only',
      'button-group/basic',
      'dialog/basic',
    ])
  })

  it('returns an empty page for a component with no examples', async () => {
    const result = await callTool({ component: 'ghost-button' })

    expect(pageOf(result)).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
      examples: [],
      nextCursor: null,
    })
  })

  it('pages through the catalog with cursor and nextCursor', async () => {
    const first = await callTool({ limit: 2 })
    const second = await callTool({
      limit: 2,
      cursor: pageOf(first).nextCursor,
    })
    // limit may change between pages; the cursor only carries the offset.
    const third = await callTool({
      limit: 100,
      cursor: pageOf(second).nextCursor,
    })

    expect(idsOf(first)).toEqual(['button/basic', 'button/icon-only'])
    expect(idsOf(second)).toEqual(['button/themed', 'button-group/basic'])
    expect(idsOf(third)).toEqual(['dialog/basic'])
    expect(pageOf(first).nextCursor).toEqual(expect.any(String))
    expect(pageOf(third).nextCursor).toBeNull()
    expect(first.content).toEqual([
      {
        type: 'text',
        text: '2 of 5 catalog examples (metadata only).',
      },
    ])
  })

  it('pages a component query and keeps source on later pages', async () => {
    const first = await callTool({ component: 'button', limit: 2 })
    const second = await callTool({
      component: 'button',
      limit: 2,
      cursor: pageOf(first).nextCursor,
    })

    expect(idsOf(second)).toEqual(['button/themed'])
    expect(pageOf(second).examples[0]).toHaveProperty('source')
    expect(pageOf(second).nextCursor).toBeNull()
  })

  it('rejects a cursor replayed with other filters or against another bundle', async () => {
    const { nextCursor } = pageOf(await callTool({ limit: 1 }))
    const otherBundle = { ...stamp, assetBundleId: `sha256:${'d'.repeat(64)}` }

    const results = [
      await callTool({ limit: 1, layer: 'themed', cursor: nextCursor }),
      await callTool({ component: 'button', limit: 1, cursor: nextCursor }),
      await callTool({ limit: 1, cursor: nextCursor }, { stamp: otherBundle }),
    ]

    for (const result of results) {
      const envelope = envelopeOf(result)
      expect(envelope.code).toBe('INVALID_INPUT')
      expect(envelope.message).toMatch(/^Invalid arguments: cursor: /)
    }
  })

  it.each([
    'not-a-cursor',
    Buffer.from('{"offset":0,"key":"x"}').toString('base64url'),
    Buffer.from('[1]').toString('base64url'),
  ])('rejects the malformed cursor %s as INVALID_INPUT', async (cursor) => {
    const envelope = envelopeOf(await callTool({ cursor }))

    expect(envelope.code).toBe('INVALID_INPUT')
  })

  it('reports an unknown id as NOT_FOUND', async () => {
    const envelope = envelopeOf(await callTool({ id: 'button/missing' }))

    expect(envelope).toMatchObject({
      code: 'NOT_FOUND',
      message: 'No example with id button/missing.',
      data: { tool: 'get_examples', ghostvueVersion: '0.1.0' },
    })
  })

  it('never resolves an id outside the catalog, such as a relative path', async () => {
    const envelope = envelopeOf(await callTool({ id: '../catalog' }))

    expect(envelope.code).toBe('NOT_FOUND')
    expect(logged).toEqual([])
  })

  it('reports a known id outside the requested layer as NOT_FOUND', async () => {
    const envelope = envelopeOf(
      await callTool({ id: 'button/basic', layer: 'themed' }),
    )

    expect(envelope).toMatchObject({
      code: 'NOT_FOUND',
      message:
        'No themed example with id button/basic; it is a headless example.',
    })
  })

  it.each([
    [{ id: 'button/basic', component: 'button' }, /either id or component/],
    [{ id: '' }, /id:/],
    [{ component: 'button/' }, /component: Must be a kebab-case/],
    [{ component: 'Button' }, /component:/],
    [{ layer: 'styled' }, /layer:/],
    [{ includeSource: 'yes' }, /includeSource:/],
    [{ limit: 0 }, /limit:/],
    [{ limit: 101 }, /limit:/],
    [{ limit: 1.5 }, /limit:/],
    [{ cursor: '' }, /cursor:/],
    [{ name: 'button/basic' }, /Unrecognized key/],
  ])('rejects %j as INVALID_INPUT', async (args, message) => {
    const envelope = envelopeOf(await callTool(args))

    expect(envelope.code).toBe('INVALID_INPUT')
    expect(envelope.message).toMatch(message)
  })

  it('accepts the documented limit bounds', async () => {
    for (const limit of [1, 100]) {
      const result = await callTool({ limit })
      expect(result.isError).toBeUndefined()
    }
  })

  it('fails with VERSION_MISMATCH before reading the catalog', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: fixtureDirectory('does-not-exist'),
    })
    const envelope = envelopeOf(
      await callTool(
        { id: 'button/basic', expectedGhostvueVersion: '9.9.9' },
        { tool },
      ),
    )

    expect(envelope).toMatchObject({
      code: 'VERSION_MISMATCH',
      data: { tool: 'get_examples', ghostvueVersion: '0.1.0' },
    })
    expect(logged).toEqual([])
  })

  it('reports a missing catalog as a sanitized INTERNAL error', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: fixtureDirectory('does-not-exist'),
    })
    const envelope = envelopeOf(await callTool({}, { tool }))

    expect(envelope.code).toBe('INTERNAL')
    expect(envelope.message).not.toMatch(/does-not-exist/)
    expect(logged.join('\n')).toMatch(/does-not-exist/)
  })

  it('reports a missing bundled source as a sanitized INTERNAL error', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: fixtureDirectory('examples-missing-source'),
    })

    // Metadata alone does not need the source file.
    expect(idsOf(await callTool({}, { tool }))).toEqual(['button/basic'])
    const envelope = envelopeOf(
      await callTool({ id: 'button/basic' }, { tool }),
    )
    expect(envelope.code).toBe('INTERNAL')
    expect(envelope.message).not.toMatch(/fixtures/)
    expect(logged.join('\n')).toMatch(/examples-missing-source/)
  })

  it('reports a catalog whose sourcePath disagrees with its id as MANIFEST_INVALID', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: fixtureDirectory('examples-invalid'),
    })
    const envelope = envelopeOf(await callTool({}, { tool }))

    expect(envelope).toMatchObject({
      code: 'MANIFEST_INVALID',
      message:
        'Bundled examples/catalog.json does not match the example catalog shape: example button/basic has sourcePath examples/button/other.vue, expected examples/button/basic.vue.',
    })
  })

  it.each([
    ['examples-unsafe-id', /at examples\[0\]\.id/],
    ['examples-duplicate', /example button\/basic is listed more than once/],
  ])(
    'refuses to serve the corrupted catalog in %s',
    async (fixture, message) => {
      const tool = createGetExamplesTool({
        assetsDirectory: fixtureDirectory(fixture),
      })
      const envelope = envelopeOf(await callTool({}, { tool }))

      expect(envelope.code).toBe('MANIFEST_INVALID')
      expect(envelope.message).toMatch(message)
      expect(envelope.message).not.toMatch(/fixtures/)
    },
  )
})
