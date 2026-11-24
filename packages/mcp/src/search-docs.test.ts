/** @vitest-environment node */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'

import { type GhostvueStamp } from './contract.js'
import { type ToolErrorEnvelope } from './errors.js'
import { createSearchDocsTool } from './search-docs.js'
import { createGhostvueServer } from './server.js'
import { type GhostvueTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'c'.repeat(64)}`,
  manifestSchemaId: 'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
}

const fixtureTool = createSearchDocsTool({
  assetsDirectory: new URL('../test/fixtures/assets/', import.meta.url),
})

const missingTool = () =>
  createSearchDocsTool({
    assetsDirectory: new URL('./does-not-exist/', import.meta.url),
  })

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
  tool: GhostvueTool = fixtureTool,
): Promise<CallToolResult> {
  const server = createGhostvueServer({
    stamp,
    tools: [tool],
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
    name: 'search_docs',
    arguments: args,
  })
  return result as CallToolResult
}

function envelopeOf(result: CallToolResult): ToolErrorEnvelope {
  expect(result.isError).toBe(true)
  const [block] = result.content
  if (block?.type !== 'text') throw new Error('expected a text error block')
  return JSON.parse(block.text) as ToolErrorEnvelope
}

interface Hit {
  title: string
  link: string
  section: string
  score: number
  snippet: string
}

function hitsOf(result: CallToolResult): Hit[] {
  expect(result.isError).toBeUndefined()
  const content = result.structuredContent as { hits: Hit[] } | undefined
  return content?.hits ?? []
}

describe('search_docs', () => {
  it('advertises the §5.4 inputs and defaults', () => {
    const { inputSchema, outputSchema, annotations } = fixtureTool.descriptor

    expect(inputSchema.properties).toMatchObject({
      query: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 },
      section: { type: 'string' },
      expectedGhostvueVersion: { type: 'string' },
    })
    expect(inputSchema.required).toEqual(['query'])
    expect(outputSchema?.required).toEqual(
      expect.arrayContaining(['schemaVersion', 'ghostvue', 'hits']),
    )
    expect(annotations).toMatchObject({ readOnlyHint: true })
  })

  it('returns stamped hits with title, link, section, score, and snippet', async () => {
    const result = await callTool({ query: 'keyboard' })

    expect(result.structuredContent).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
      hits: [
        {
          title: 'Button',
          link: '/components/button',
          section: 'Components',
          score: expect.any(Number) as number,
          snippet: expect.stringContaining(
            'Keyboard Space and Enter activate the button',
          ) as string,
        },
      ],
    })
    expect(result.content).toEqual([
      {
        type: 'text',
        text: '1 docs page, best first: /components/button',
      },
    ])
  })

  it('ranks the page titled with the term first', async () => {
    const links = hitsOf(await callTool({ query: 'button' })).map(
      (hit) => hit.link,
    )

    expect(links).toEqual(['/components/button', '/getting-started'])
  })

  it('combines terms and keeps dotted identifiers whole', async () => {
    const [first] = hitsOf(await callTool({ query: 'action.primary.bg' }))

    expect(first).toMatchObject({ link: '/themes/tokens' })
    expect(first?.snippet).toContain('action.primary.bg')
  })

  it('breaks score ties by link path within a section', async () => {
    const hits = hitsOf(await callTool({ query: 'roundness' }))

    expect(hits.map((hit) => hit.link)).toEqual([
      '/adr/0002-exit-foundation',
      '/adr/0003-public-api',
      '/themes/tokens',
    ])
    expect(hits[0]?.score).toBe(hits[1]?.score)
  })

  it('restricts hits to one top-level section', async () => {
    const hits = hitsOf(
      await callTool({ query: 'focus button', section: 'Components' }),
    )

    expect(hits.map((hit) => hit.section)).toEqual(['Components', 'Components'])
  })

  it('caps hits at limit', async () => {
    const hits = hitsOf(await callTool({ query: 'roundness', limit: 1 }))

    expect(hits.map((hit) => hit.link)).toEqual(['/adr/0002-exit-foundation'])
  })

  it('returns no hits for a query that matches nothing or has only short tokens', async () => {
    for (const query of ['tooltip', 'a b']) {
      const result = await callTool({ query })
      expect(hitsOf(result)).toEqual([])
      expect(result.content).toEqual([
        { type: 'text', text: 'No docs pages match.' },
      ])
    }
  })

  it('rejects a section label the corpus does not have, listing the valid ones', async () => {
    const envelope = envelopeOf(
      await callTool({ query: 'button', section: 'Architecture' }),
    )

    expect(envelope).toMatchObject({
      code: 'INVALID_INPUT',
      message:
        'Invalid arguments: section must be one of Docs, Components, Theming, Contribute.',
      data: { tool: 'search_docs' },
    })
  })

  it.each([
    [{}, /query:/],
    [{ query: '' }, /query: Must not be empty/],
    [{ query: ' \t\n ' }, /query: Must not be empty/],
    [{ query: 42 }, /query:/],
    [{ query: 'button', limit: 0 }, /limit:/],
    [{ query: 'button', limit: 26 }, /limit:/],
    [{ query: 'button', limit: 2.5 }, /limit:/],
    [{ query: 'button', section: '' }, /section:/],
    [{ query: 'button', prefix: 'docs' }, /Unrecognized key/],
  ])('rejects %j as INVALID_INPUT', async (args, message) => {
    const envelope = envelopeOf(await callTool(args))

    expect(envelope.code).toBe('INVALID_INPUT')
    expect(envelope.message).toMatch(message)
  })

  it('accepts the documented limit bounds', async () => {
    for (const limit of [1, 25]) {
      expect(
        (await callTool({ query: 'button', limit })).isError,
      ).toBeUndefined()
    }
  })

  it('fails with VERSION_MISMATCH before reading the corpus', async () => {
    const envelope = envelopeOf(
      await callTool(
        { query: 'button', expectedGhostvueVersion: '9.9.9' },
        missingTool(),
      ),
    )

    expect(envelope).toMatchObject({
      code: 'VERSION_MISMATCH',
      data: { tool: 'search_docs', ghostvueVersion: '0.1.0' },
    })
    expect(logged).toEqual([])
  })

  it('reports a missing corpus as a sanitized INTERNAL error', async () => {
    const envelope = envelopeOf(
      await callTool({ query: 'button' }, missingTool()),
    )

    expect(envelope.code).toBe('INTERNAL')
    expect(envelope.message).not.toMatch(/does-not-exist/)
    expect(logged.join('\n')).toMatch(/does-not-exist/)
  })

  it('reports a corpus of the wrong shape as MANIFEST_INVALID', async () => {
    const tool = createSearchDocsTool({
      assetsDirectory: new URL(
        '../test/fixtures/docs-invalid/',
        import.meta.url,
      ),
    })
    const envelope = envelopeOf(await callTool({ query: 'button' }, tool))

    expect(envelope.code).toBe('MANIFEST_INVALID')
    expect(envelope.message).toMatch(
      /^Bundled docs\/pages\.json does not match/,
    )
    expect(envelope.message).not.toMatch(/fixtures/)
  })
})
