/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { PassThrough } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { binName, builtInTools, runCli } from './cli.js'

const fixtureSources = {
  assetsDirectory: new URL('../test/fixtures/assets/', import.meta.url),
  packageJson: new URL('../package.json', import.meta.url),
}

function collect(stream: PassThrough): () => string {
  let text = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => (text += chunk))
  return () => text
}

describe('runCli', () => {
  it('matches the bin declared in package.json', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { bin?: Record<string, string> }

    expect(packageJson.bin).toEqual({ [binName]: './dist/bin.js' })
  })

  it('serves no tools until the discovery tools land', () => {
    expect(builtInTools).toEqual([])
  })

  it('serves until stdin ends, then resolves with exit code 0', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const diagnostics = collect(stderr)
    const firstFrame = new Promise<string>((resolve) => {
      stdout.once('data', (chunk: Buffer) => {
        resolve(chunk.toString('utf8'))
      })
    })

    const run = runCli({ stdin, stdout, stderr, sources: fixtureSources })
    stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })}\n`,
    )
    const frame = await firstFrame
    stdin.end()

    await expect(run).resolves.toBe(0)
    expect(JSON.parse(frame)).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [] },
    })
    expect(diagnostics()).toBe('')
  })

  it('writes the bundle failure to stderr only and returns 1', async () => {
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const output = collect(stdout)
    const diagnostics = collect(stderr)

    await expect(
      runCli({
        stdin: new PassThrough(),
        stdout,
        stderr,
        sources: {
          ...fixtureSources,
          assetsDirectory: new URL('./does-not-exist/', import.meta.url),
        },
      }),
    ).resolves.toBe(1)
    expect(output()).toBe('')
    expect(diagnostics()).toMatch(
      /^ghostvue-mcp: Cannot read Asset bundle identity/,
    )
  })
})
