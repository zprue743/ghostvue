import { type Readable, type Writable } from 'node:stream'

import { Server } from '@modelcontextprotocol/sdk/server'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

import { type GhostvueStamp } from './contract.js'
import { type DiagnosticLog, type GhostvueTool } from './tool.js'

/** MCP `serverInfo.name` reported during `initialize`. */
export const serverName = 'ghostvue'

/** Inputs for {@link createGhostvueServer}. */
export interface GhostvueServerOptions {
  /** Identity stamped onto every success payload and error envelope. */
  readonly stamp: GhostvueStamp
  /** Tools to serve; names must be unique. */
  readonly tools: readonly GhostvueTool[]
  /** Operator diagnostics (full detail for sanitized `INTERNAL` errors). */
  readonly log: DiagnosticLog
}

/**
 * Builds the MCP server with the `tools` capability only (GHO-17 plan §2):
 * no resources, prompts, logging, or completions handlers are registered, and
 * the SDK rejects any request for a capability that was not declared.
 *
 * This uses the SDK's low-level `Server` (the `@modelcontextprotocol/sdk/server`
 * entry) rather than `McpServer`. `McpServer` validates arguments itself and
 * rewrites validation and handler failures into plain-text tool errors, which
 * cannot carry the §10 error envelope (`INVALID_INPUT`, `VERSION_MISMATCH`, …)
 * or run the version guard before validation. The SDK marks `Server` as
 * deprecated for ordinary use but keeps it for exactly this kind of advanced
 * protocol control.
 */
export function createGhostvueServer(options: GhostvueServerOptions) {
  const tools = new Map<string, GhostvueTool>()
  for (const tool of options.tools) {
    if (tools.has(tool.name)) {
      throw new Error(`Duplicate GhostVue MCP tool name: ${tool.name}`)
    }
    tools.set(tool.name, tool)
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the §10 envelope needs low-level tools/call control; see above.
  const server = new Server(
    { name: serverName, version: options.stamp.version },
    {
      // The tool set is fixed for the life of the process, so no listChanged.
      capabilities: { tools: {} },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [...tools.values()].map((tool) => tool.descriptor),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.get(request.params.name)
    if (tool === undefined) {
      // An unknown tool is a protocol error, not a tool failure: the MCP spec
      // reports it as JSON-RPC invalid params, as the SDK's own server does.
      throw new McpError(
        ErrorCode.InvalidParams,
        `Tool ${request.params.name} not found`,
      )
    }
    return tool.call(
      request.params.arguments,
      { stamp: options.stamp },
      options.log,
    )
  })

  return server
}

/** Inputs for {@link serveStdio}. */
export interface StdioServeOptions extends GhostvueServerOptions {
  /** MCP client → server JSON-RPC frames (the process's stdin). */
  readonly stdin: Readable
  /**
   * Server → client JSON-RPC frames only. Diagnostics must go to `log`
   * (stderr), because any other byte on stdout corrupts the MCP stream.
   */
  readonly stdout: Writable
}

/**
 * Serves MCP over stdio until the client shuts down.
 *
 * The MCP stdio lifecycle ends when the client closes the server's stdin.
 * The SDK transport does not watch for that, so this does: on end of input it
 * closes the server, and the returned promise resolves so the process can
 * exit on its own.
 */
export async function serveStdio(options: StdioServeOptions): Promise<void> {
  const server = createGhostvueServer(options)
  const transport = new StdioServerTransport(options.stdin, options.stdout)
  const closed = new Promise<void>((resolve) => {
    server.onclose = resolve
  })
  server.onerror = (error) => {
    options.log(`transport error: ${error.message}`)
  }

  const shutdown = () => {
    void server.close()
  }
  options.stdin.once('end', shutdown)
  options.stdin.once('close', shutdown)

  await server.connect(transport)
  await closed
  options.stdin.off('end', shutdown)
  options.stdin.off('close', shutdown)
}
