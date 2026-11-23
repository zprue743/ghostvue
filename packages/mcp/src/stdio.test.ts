/** @vitest-environment node */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'

/**
 * Real-process smoke tests: they run the server over a child process's
 * stdin/stdout, exactly as an MCP host does, so stdout framing, stderr
 * diagnostics, and exit on end of input are covered without a build.
 */
const fixtures = new URL('../test/fixtures/', import.meta.url)
const resolveTsHook = fileURLToPath(new URL('resolve-ts.mjs', fixtures))

interface Exit {
  readonly code: number | null
  readonly stdout: readonly string[]
  readonly stderr: string
}

function startNode(entry: URL) {
  const child = spawn(
    process.execPath,
    ['--import', resolveTsHook, fileURLToPath(entry)],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  )
  const stdoutLines: string[] = []
  const waiting = new Map<number, (message: unknown) => void>()
  let stderr = ''

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => (stderr += chunk))
  createInterface({ input: child.stdout }).on('line', (line) => {
    stdoutLines.push(line)
    const message: unknown = JSON.parse(line)
    const id: unknown =
      typeof message === 'object' && message !== null
        ? Reflect.get(message, 'id')
        : undefined
    if (typeof id === 'number') {
      waiting.get(id)?.(message)
    }
  })

  const exited = new Promise<Exit>((resolve) => {
    child.on('close', (code) => {
      resolve({ code, stdout: stdoutLines, stderr })
    })
  })

  let nextId = 1
  return {
    exited,
    request(method: string, params?: object): Promise<unknown> {
      const id = nextId++
      const response = new Promise<unknown>((resolve) =>
        waiting.set(id, resolve),
      )
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`,
      )
      return response
    },
    notify(method: string) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method })}\n`)
    },
    endInput() {
      child.stdin.end()
    },
  }
}

describe('ghostvue-mcp over stdio', () => {
  it('initializes, lists tools, answers a call, and exits when stdin closes', async () => {
    const server = startNode(new URL('stdio-server.mjs', fixtures))

    await expect(
      server.request('initialize', {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'smoke', version: '1.0.0' },
      }),
    ).resolves.toMatchObject({
      id: 1,
      result: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'ghostvue', version: '0.0.0' },
      },
    })
    server.notify('notifications/initialized')

    await expect(server.request('tools/list')).resolves.toMatchObject({
      result: {
        tools: [
          {
            name: 'fixture_lookup',
            annotations: { readOnlyHint: true },
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
          },
        ],
      },
    })

    await expect(
      server.request('tools/call', {
        name: 'fixture_lookup',
        arguments: { name: 'Ada' },
      }),
    ).resolves.toMatchObject({
      result: {
        structuredContent: {
          schemaVersion: '1.0.0',
          ghostvue: {
            version: '0.0.0',
            assetBundleId: `sha256:${'0'.repeat(64)}`,
            manifestSchemaId:
              'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
          },
          greeting: 'Hello, Ada',
        },
        content: [{ type: 'text', text: 'Greeted Ada.' }],
      },
    })

    server.endInput()
    const exit = await server.exited

    expect(exit.code).toBe(0)
    // Every stdout line is a JSON-RPC frame; diagnostics never leak there.
    expect(exit.stdout).toHaveLength(3)
    for (const line of exit.stdout) {
      expect(JSON.parse(line)).toMatchObject({ jsonrpc: '2.0' })
    }
  })

  it('exits 1 with a stderr diagnostic when the package bundle is missing', async () => {
    // From src/, the bin's package-relative assets directory does not exist,
    // which is the state of an unbuilt package.
    const bin = startNode(new URL('../src/bin.ts', import.meta.url))
    bin.endInput()
    const exit = await bin.exited

    expect(exit.code).toBe(1)
    expect(exit.stdout).toEqual([])
    expect(exit.stderr).toContain('ghostvue-mcp: Cannot read')
  })
})
