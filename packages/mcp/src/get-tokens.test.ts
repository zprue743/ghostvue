/** @vitest-environment node */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'

import { type GhostvueStamp } from './contract.js'
import { type ToolErrorEnvelope } from './errors.js'
import { createGetTokensTool } from './get-tokens.js'
import { createGhostvueServer } from './server.js'
import { type GhostvueTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'c'.repeat(64)}`,
  manifestSchemaId: 'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
}

const fixtureTool = createGetTokensTool({
  assetsDirectory: new URL('../test/fixtures/assets/', import.meta.url),
})

const fixtureHeader = {
  schemaVersion: '1.0.0',
  theme: 'default',
  modes: ['light', 'dark'],
  densities: ['compact', 'comfortable', 'spacious'],
  attributes: {
    theme: 'data-ghost-theme',
    mode: 'data-ghost-mode',
    density: 'data-ghost-density',
  },
  tokenCount: 6,
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
  const result = await client.callTool({ name: 'get_tokens', arguments: args })
  return result as CallToolResult
}

function envelopeOf(result: CallToolResult): ToolErrorEnvelope {
  expect(result.isError).toBe(true)
  const [block] = result.content
  if (block?.type !== 'text') throw new Error('expected a text error block')
  return JSON.parse(block.text) as ToolErrorEnvelope
}

describe('get_tokens', () => {
  it('advertises the §5.5 inputs with M5 defaults', () => {
    const { inputSchema, outputSchema, annotations } = fixtureTool.descriptor

    expect(inputSchema.properties).toMatchObject({
      name: { type: 'string' },
      prefix: { type: 'string' },
      tier: { enum: ['primitive', 'semantic'] },
      includeValues: { type: 'boolean', default: true },
      limit: { type: 'integer', minimum: 1, maximum: 2000, default: 100 },
      expectedGhostvueVersion: { type: 'string' },
    })
    expect(inputSchema.required ?? []).toEqual([])
    expect(outputSchema?.required).toEqual(
      expect.arrayContaining(['schemaVersion', 'ghostvue', 'catalog']),
    )
    expect(annotations).toMatchObject({ readOnlyHint: true })
  })

  it('returns only the catalog header when neither name nor prefix is given', async () => {
    const result = await callTool()

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
      catalog: fixtureHeader,
    })
  })

  it('accepts a call with no arguments object at all', async () => {
    const result = await callTool(undefined)

    expect(result.structuredContent).toMatchObject({ catalog: fixtureHeader })
    expect(result.structuredContent).not.toHaveProperty('tokens')
  })

  it('returns one token by exact name with values per mode', async () => {
    const result = await callTool({ name: 'action.primary.bg' })

    expect(result.structuredContent).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
      catalog: fixtureHeader,
      tokens: [
        {
          name: 'action.primary.bg',
          type: 'color',
          tier: 'semantic',
          cssVar: '--ghost-action-primary-bg',
          value: { light: '#1d4ed8', dark: '#60a5fa' },
        },
      ],
    })
    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Token action.primary.bg (semantic color, --ghost-action-primary-bg).',
      },
    ])
  })

  it('does not treat a name as a prefix', async () => {
    const envelope = envelopeOf(await callTool({ name: 'action.primary' }))

    expect(envelope).toMatchObject({
      code: 'NOT_FOUND',
      message: 'No token named action.primary.',
      data: { tool: 'get_tokens', ghostvueVersion: '0.1.0' },
    })
  })

  it('reports a known name outside the requested tier as NOT_FOUND', async () => {
    const envelope = envelopeOf(
      await callTool({ name: 'color.blue.400', tier: 'semantic' }),
    )

    expect(envelope).toMatchObject({
      code: 'NOT_FOUND',
      message:
        'No semantic token named color.blue.400; it is a primitive token.',
    })
  })

  it('matches prefix on whole dotted segments only', async () => {
    const result = await callTool({ prefix: 'action.primary' })

    expect(result.structuredContent).toMatchObject({
      matchCount: 2,
      tokens: [
        { name: 'action.primary.bg' },
        { name: 'action.primary.bg.hover' },
      ],
    })
  })

  it('omits cssVar for tokens the themes build emits no variable for', async () => {
    const result = await callTool({ name: 'color.blue.400' })

    expect(result.structuredContent).toMatchObject({
      tokens: [
        {
          name: 'color.blue.400',
          type: 'color',
          tier: 'primitive',
          value: { light: '#60a5fa', dark: '#60a5fa' },
        },
      ],
    })
    expect(result.content).toEqual([
      { type: 'text', text: 'Token color.blue.400 (primitive color).' },
    ])
    const { tokens } = result.structuredContent as {
      tokens: Record<string, unknown>[]
    }
    expect(tokens[0]).not.toHaveProperty('cssVar')
  })

  it('filters a prefix query by tier', async () => {
    const primitive = await callTool({ prefix: 'color', tier: 'primitive' })
    const semantic = await callTool({ prefix: 'color', tier: 'semantic' })

    expect(primitive.structuredContent).toMatchObject({
      matchCount: 2,
      tokens: [{ name: 'color.blue.400' }, { name: 'color.blue.700' }],
    })
    expect(semantic.structuredContent).toMatchObject({
      matchCount: 1,
      tokens: [{ name: 'color.semantic.alias', tier: 'semantic' }],
    })
  })

  it('caps a prefix query at limit and reports the full match count', async () => {
    const result = await callTool({ prefix: 'action', limit: 1 })

    expect(result.structuredContent).toMatchObject({
      matchCount: 3,
      tokens: [{ name: 'action.primary.bg' }],
    })
    expect(result.content).toEqual([
      { type: 'text', text: '1 of 3 tokens under action.' },
    ])
  })

  it('returns an empty list for a prefix with no matches', async () => {
    const result = await callTool({ prefix: 'spacing' })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({
      matchCount: 0,
      tokens: [],
    })
  })

  it('omits values when includeValues is false', async () => {
    const result = await callTool({ prefix: 'color', includeValues: false })

    expect(result.structuredContent).toMatchObject({
      tokens: [
        expect.anything(),
        expect.anything(),
        {
          name: 'color.semantic.alias',
          type: 'color',
          tier: 'semantic',
          cssVar: '--ghost-color-semantic-alias',
        },
      ],
    })
    const { tokens } = result.structuredContent as {
      tokens: Record<string, unknown>[]
    }
    for (const token of tokens) expect(token).not.toHaveProperty('value')
  })

  it.each([
    [{ name: 'action.primary.bg', prefix: 'action' }, /either name or prefix/],
    [{ prefix: 'action.' }, /prefix: Must not end with "\."/],
    [{ name: '' }, /name:/],
    [{ prefix: 'action', limit: 0 }, /limit:/],
    [{ prefix: 'action', limit: 2001 }, /limit:/],
    [{ prefix: 'action', limit: 1.5 }, /limit:/],
    [{ tier: 'component' }, /tier:/],
    [{ includeValues: 'no' }, /includeValues:/],
    [{ query: 'action' }, /Unrecognized key/],
  ])('rejects %j as INVALID_INPUT', async (args, message) => {
    const envelope = envelopeOf(await callTool(args))

    expect(envelope.code).toBe('INVALID_INPUT')
    expect(envelope.message).toMatch(message)
  })

  it('accepts the documented limit bounds', async () => {
    for (const limit of [1, 2000]) {
      const result = await callTool({ prefix: 'action', limit })
      expect(result.isError).toBeUndefined()
    }
  })

  it('fails with VERSION_MISMATCH before reading the catalog', async () => {
    const tool = createGetTokensTool({
      assetsDirectory: new URL('./does-not-exist/', import.meta.url),
    })
    const envelope = envelopeOf(
      await callTool(
        { name: 'action.primary.bg', expectedGhostvueVersion: '9.9.9' },
        tool,
      ),
    )

    expect(envelope).toMatchObject({
      code: 'VERSION_MISMATCH',
      data: { tool: 'get_tokens', ghostvueVersion: '0.1.0' },
    })
    expect(logged).toEqual([])
  })

  it('reports a missing catalog as a sanitized INTERNAL error', async () => {
    const tool = createGetTokensTool({
      assetsDirectory: new URL('./does-not-exist/', import.meta.url),
    })
    const envelope = envelopeOf(await callTool({}, tool))

    expect(envelope.code).toBe('INTERNAL')
    expect(envelope.message).not.toMatch(/does-not-exist/)
    expect(logged.join('\n')).toMatch(/does-not-exist/)
  })

  it('reports a catalog of the wrong shape as MANIFEST_INVALID', async () => {
    const tool = createGetTokensTool({
      assetsDirectory: new URL(
        '../test/fixtures/tokens-invalid/',
        import.meta.url,
      ),
    })
    const envelope = envelopeOf(await callTool({}, tool))

    expect(envelope.code).toBe('MANIFEST_INVALID')
    expect(envelope.message).toMatch(/^Bundled tokens\.json does not match/)
    expect(envelope.message).not.toMatch(/fixtures/)
  })

  // The bundle copies @ghostvue/themes tokens.json byte for byte (§3.5), so
  // the in-repo generated catalog is what ships; guard the tool against drift
  // in the themes token pipeline.
  it('serves the generated @ghostvue/themes catalog', async () => {
    const tool = createGetTokensTool({
      assetsDirectory: new URL('../../themes/src/generated/', import.meta.url),
    })

    const header = await callTool({}, tool)
    const entry = await callTool({ name: 'action.primary.bg' }, tool)

    expect(header.structuredContent).toMatchObject({
      catalog: {
        modes: ['light', 'dark'],
        tokenCount: expect.any(Number) as number,
      },
    })
    expect(entry.structuredContent).toMatchObject({
      tokens: [
        {
          name: 'action.primary.bg',
          tier: 'semantic',
          cssVar: '--ghost-action-primary-bg',
          value: {
            light: expect.any(String) as string,
            dark: expect.any(String) as string,
          },
        },
      ],
    })
  })
})
