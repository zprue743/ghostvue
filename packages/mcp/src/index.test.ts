/** @vitest-environment node */

import { readFile } from 'node:fs/promises'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { binName, runStub } from './index.js'

describe('ghostvue-mcp stub', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  it('matches the bin declared in package.json', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { bin?: Record<string, string> }

    expect(packageJson.bin).toEqual({ [binName]: './dist/bin.js' })
  })

  it('reports that no tools exist on stderr and fails', () => {
    const chunks: string[] = []

    expect(runStub({ write: (chunk) => chunks.push(chunk) })).toBe(1)
    expect(chunks).toEqual([
      'ghostvue-mcp: the GhostVue MCP server is not implemented yet; no tools are registered.\n',
    ])
  })

  it('keeps stdout clear for MCP frames when run as the bin', async () => {
    const stdout = vi.spyOn(process.stdout, 'write')
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)

    await import('./bin.js')

    expect(process.exitCode).toBe(1)
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('no tools are registered'),
    )
    expect(stdout).not.toHaveBeenCalled()
  })
})
