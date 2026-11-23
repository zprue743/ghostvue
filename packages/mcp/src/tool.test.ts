/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import * as z from 'zod'

import { type GhostvueStamp, toolContractSchemaVersion } from './contract.js'
import {
  GhostvueToolError,
  toolErrorCodes,
  type ToolErrorEnvelope,
} from './errors.js'
import { defineTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'a'.repeat(64)}`,
  manifestSchemaId: 'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
}

function createLookupTool(onRun: () => void = () => undefined) {
  return defineTool({
    name: 'lookup',
    title: 'Lookup',
    description: 'Fixture tool covering every failure path.',
    input: {
      name: z.string().min(1),
      limit: z.int().min(1).max(5).default(2),
    },
    output: { greeting: z.string().min(3), limit: z.int() },
    handler: ({ name, limit }) => {
      onRun()
      switch (name) {
        case 'missing':
          throw new GhostvueToolError('NOT_FOUND', 'No component named missing')
        case 'corrupt':
          throw new GhostvueToolError(
            'MANIFEST_INVALID',
            'Bundled manifest for corrupt fails the schema',
          )
        case 'crash':
          throw new Error('ENOENT: /home/someone/secret/path.json')
        case 'short':
          // Violates the declared outputSchema (`minLength: 3`).
          return { structuredContent: { greeting: 'hi', limit } }
        default:
          return {
            structuredContent: { greeting: `Hello, ${name}`, limit },
            summary: `Greeted ${name}.`,
          }
      }
    },
  })
}

async function callLookup(args: unknown, onRun?: () => void) {
  const logged: string[] = []
  const result = await createLookupTool(onRun).call(args, { stamp }, (line) =>
    logged.push(line),
  )
  return { result, logged }
}

function envelopeOf(result: { content?: unknown[] }): ToolErrorEnvelope {
  const [first] = result.content ?? []
  const parsed = z
    .object({ type: z.literal('text'), text: z.string() })
    .parse(first)
  return z
    .object({
      code: z.enum(toolErrorCodes),
      message: z.string(),
      data: z.object({
        tool: z.string(),
        ghostvueVersion: z.string(),
        schemaVersion: z.literal(toolContractSchemaVersion),
      }),
    })
    .parse(JSON.parse(parsed.text))
}

describe('defineTool', () => {
  it('advertises the version guard on input and the stamp on output', () => {
    const { descriptor } = createLookupTool()

    expect(descriptor.inputSchema).toMatchObject({
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        expectedGhostvueVersion: { type: 'string' },
      },
    })
    expect(descriptor.inputSchema).toHaveProperty(
      '$schema',
      'http://json-schema.org/draft-07/schema#',
    )
    expect(descriptor.outputSchema).toMatchObject({
      type: 'object',
      required: ['schemaVersion', 'ghostvue', 'greeting', 'limit'],
      properties: {
        schemaVersion: { const: toolContractSchemaVersion },
        ghostvue: {
          required: ['version', 'assetBundleId', 'manifestSchemaId'],
        },
      },
    })
    expect(descriptor.annotations).toEqual({
      title: 'Lookup',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
  })

  it('stamps success payloads and applies input defaults', async () => {
    const { result } = await callLookup({ name: 'Ada' })

    expect(result).toEqual({
      structuredContent: {
        schemaVersion: '1.0.0',
        ghostvue: stamp,
        greeting: 'Hello, Ada',
        limit: 2,
      },
      content: [{ type: 'text', text: 'Greeted Ada.' }],
    })
  })

  it('accepts a matching expectedGhostvueVersion without passing it to the handler', async () => {
    const { result } = await callLookup({
      name: 'Ada',
      expectedGhostvueVersion: stamp.version,
    })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({ greeting: 'Hello, Ada' })
  })

  it('returns VERSION_MISMATCH before validating input or running the tool', async () => {
    let runs = 0
    const { result } = await callLookup(
      { expectedGhostvueVersion: '9.9.9', name: 42 },
      () => (runs += 1),
    )

    expect(runs).toBe(0)
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(envelopeOf(result)).toEqual({
      code: 'VERSION_MISMATCH',
      message: 'Expected @ghostvue/mcp 9.9.9, but this server is 0.1.0.',
      data: {
        tool: 'lookup',
        ghostvueVersion: '0.1.0',
        schemaVersion: '1.0.0',
      },
    })
  })

  it.each([
    [{ expectedGhostvueVersion: 1, name: 'Ada' }, 'expectedGhostvueVersion'],
    [{ name: '' }, 'name'],
    [{ name: 'Ada', limit: 6 }, 'limit'],
    [{ name: 'Ada', extra: true }, 'extra'],
    [undefined, 'name'],
    ['not-an-object', 'expected object'],
    [['Ada'], 'expected object'],
  ])('maps invalid arguments %j to INVALID_INPUT', async (args, mentions) => {
    let runs = 0
    const { result } = await callLookup(args, () => (runs += 1))
    const envelope = envelopeOf(result)

    expect(runs).toBe(0)
    expect(envelope.code).toBe('INVALID_INPUT')
    expect(envelope.message).toMatch(/^Invalid arguments: /)
    expect(envelope.message).toContain(mentions)
  })

  it.each([
    ['missing', 'NOT_FOUND', 'No component named missing'],
    [
      'corrupt',
      'MANIFEST_INVALID',
      'Bundled manifest for corrupt fails the schema',
    ],
  ])(
    'passes a deliberate %s failure through as %s',
    async (name, code, message) => {
      const { result, logged } = await callLookup({ name })

      expect(envelopeOf(result)).toMatchObject({ code, message })
      expect(logged).toEqual([])
    },
  )

  it('sanitizes unexpected exceptions as INTERNAL and logs the detail', async () => {
    const { result, logged } = await callLookup({ name: 'crash' })
    const envelope = envelopeOf(result)

    expect(envelope.code).toBe('INTERNAL')
    expect(envelope.message).toBe(
      "Unexpected internal error in lookup. See the server's stderr log for details.",
    )
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(logged).toEqual([
      expect.stringContaining('/home/someone/secret/path.json'),
    ])
  })

  it('reports output that breaks its own outputSchema as INTERNAL', async () => {
    const { result, logged } = await callLookup({ name: 'short' })

    expect(envelopeOf(result).code).toBe('INTERNAL')
    expect(result.structuredContent).toBeUndefined()
    expect(logged).toEqual([expect.stringContaining('greeting')])
  })

  it('omits text content when the handler gives no summary', async () => {
    const tool = defineTool({
      name: 'quiet',
      title: 'Quiet',
      description: 'No summary.',
      input: {},
      output: {},
      handler: () => ({ structuredContent: {} }),
    })

    const result = await tool.call({}, { stamp }, () => undefined)

    expect(result.content).toEqual([])
    expect(result.structuredContent).toEqual({
      schemaVersion: '1.0.0',
      ghostvue: stamp,
    })
  })
})
