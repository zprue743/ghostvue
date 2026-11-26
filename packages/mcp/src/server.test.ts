/** @vitest-environment node */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'

import { type GhostvueStamp } from './contract.js'
import { GhostvueToolError } from './errors.js'
import { createGhostvueServer, serverName } from './server.js'
import { defineTool, type GhostvueTool } from './tool.js'

const stamp: GhostvueStamp = {
  version: '0.1.0',
  assetBundleId: `sha256:${'b'.repeat(64)}`,
  manifestSchemaId: 'https://ghostvue.dev/schemas/v1/manifest.schema.json',
}

const findTool = defineTool({
  name: 'find',
  title: 'Find',
  description: 'Fixture tool.',
  input: { id: z.string() },
  output: { id: z.string() },
  handler: ({ id }) => {
    if (id === 'missing') {
      throw new GhostvueToolError('NOT_FOUND', 'No item missing')
    }
    return { structuredContent: { id } }
  },
})

const clients: Client[] = []

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
})

async function connect(tools: readonly GhostvueTool[] = [findTool]) {
  const server = createGhostvueServer({ stamp, tools, log: () => undefined })
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  clients.push(client)
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  return client
}

describe('createGhostvueServer', () => {
  it('declares the tools capability only', async () => {
    const client = await connect()

    expect(client.getServerCapabilities()).toEqual({ tools: {} })
    expect(client.getServerVersion()).toEqual({
      name: serverName,
      version: stamp.version,
    })
  })

  it('rejects resource and prompt requests', async () => {
    const client = await connect()

    await expect(client.listResources()).rejects.toMatchObject({
      code: ErrorCode.MethodNotFound,
    })
    await expect(client.listPrompts()).rejects.toMatchObject({
      code: ErrorCode.MethodNotFound,
    })
  })

  it('lists every registered tool with input and output schemas', async () => {
    const client = await connect()
    const { tools } = await client.listTools()

    expect(tools).toEqual([findTool.descriptor])
  })

  it('returns structuredContent the SDK client validates against outputSchema', async () => {
    const client = await connect()
    // Listing first makes the SDK client cache and enforce each outputSchema.
    await client.listTools()

    await expect(
      client.callTool({ name: 'find', arguments: { id: 'button' } }),
    ).resolves.toEqual({
      structuredContent: {
        schemaVersion: '1.0.0',
        ghostvue: stamp,
        id: 'button',
      },
      content: [],
    })
  })

  it('returns the error envelope as an isError tool result', async () => {
    const client = await connect()
    await client.listTools()

    const result = await client.callTool({
      name: 'find',
      arguments: { id: 'missing' },
    })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(result.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          code: 'NOT_FOUND',
          message: 'No item missing',
          data: {
            tool: 'find',
            ghostvueVersion: '0.1.0',
            schemaVersion: '1.0.0',
          },
        }),
      },
    ])
  })

  it('reports an unknown tool as a JSON-RPC invalid params error', async () => {
    const client = await connect()

    const call = client.callTool({ name: 'nope', arguments: {} })

    await expect(call).rejects.toBeInstanceOf(McpError)
    await expect(call).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it('refuses duplicate tool names', () => {
    expect(() =>
      createGhostvueServer({
        stamp,
        tools: [findTool, findTool],
        log: () => undefined,
      }),
    ).toThrow('Duplicate GhostVue MCP tool name: find')
  })
})
