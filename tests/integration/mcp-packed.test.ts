/** @vitest-environment node */

import { link, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  MCP_INSTALL_SIZE_BUDGET_BYTES,
  MCP_TOOL_NAMES,
  apparentSize,
  evaluateInstallSize,
  publishedContentProblems,
  renderInstallSizeReport,
  runMcpStdioSmoke,
} from '../../scripts/lib/mcp-packed.js'

// GHO-232: the pure parts of the `@ghostvue/mcp` first-publish gate. The
// end-to-end run against the real packed tarball lives in
// mcp-packed-smoke.test.ts and in `pnpm verify:build`.

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-gate-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

const builtTarball = [
  'package/package.json',
  'package/README.md',
  'package/LICENSE',
  'package/dist/bin.js',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/assets/bundle.json',
  'package/dist/assets/tokens.json',
]

describe('publishedContentProblems', () => {
  it('accepts dist/ plus the files npm always packs', () => {
    expect(publishedContentProblems(builtTarball)).toEqual([])
  })

  it('flags monorepo sources and missing entry points', () => {
    expect(
      publishedContentProblems([
        ...builtTarball.filter((entry) => entry !== 'package/dist/bin.js'),
        'package/src/server.ts',
        'package/scripts/bundle-assets.mjs',
      ]),
    ).toEqual([
      'package/src/server.ts is outside dist/',
      'package/scripts/bundle-assets.mjs is outside dist/',
      'package/dist/bin.js is missing',
    ])
  })

  it('requires the bundled assets', () => {
    expect(
      publishedContentProblems(
        builtTarball.filter((entry) => !entry.includes('/assets/')),
      ),
    ).toEqual(['package/dist/assets/bundle.json is missing'])
  })
})

describe('apparentSize', () => {
  it('counts file and symlink bytes once per inode, like du -sb', async () => {
    const root = await temporaryDirectory()
    await mkdir(join(root, 'store', 'pkg'), { recursive: true })
    await writeFile(join(root, 'store', 'pkg', 'index.js'), 'x'.repeat(1000))
    // A hard link, as pnpm makes into its virtual store, counts once.
    await link(
      join(root, 'store', 'pkg', 'index.js'),
      join(root, 'store', 'hard.js'),
    )
    // A symlink counts its own length and is not followed.
    await symlink('store/pkg', join(root, 'linked'))
    await mkdir(join(root, 'store', 'pkg', 'assets'))
    await writeFile(join(root, 'store', 'pkg', 'assets', 'a.json'), '1234')

    const linkBytes = 'store/pkg'.length
    expect(await apparentSize(root)).toBe(1000 + 4 + linkBytes)
    expect(
      await apparentSize(root, {
        exclude: [join(root, 'linked', 'assets')],
      }),
    ).toBe(1000 + linkBytes)
  })
})

describe('installed-size budget', () => {
  it('is 18 MiB and excludes the bundled assets', () => {
    expect(MCP_INSTALL_SIZE_BUDGET_BYTES).toBe(18_874_368)
    expect(
      evaluateInstallSize({
        totalBytes: MCP_INSTALL_SIZE_BUDGET_BYTES + 500,
        assetBytes: 500,
      }),
    ).toEqual({
      gatedBytes: MCP_INSTALL_SIZE_BUDGET_BYTES,
      budgetBytes: MCP_INSTALL_SIZE_BUDGET_BYTES,
      withinBudget: true,
    })
    expect(
      evaluateInstallSize({
        totalBytes: MCP_INSTALL_SIZE_BUDGET_BYTES + 501,
        assetBytes: 500,
      }).withinBudget,
    ).toBe(false)
  })

  it('reports the measurement for the CI job summary', () => {
    const within = renderInstallSizeReport({
      totalBytes: 20_000_000,
      assetBytes: 3_000_000,
      packageCount: 93,
    })
    expect(within).toContain('| **Gated size** | 17000000 | 16.21 MiB |')
    expect(within).toContain('(93 packages)')
    expect(within).toContain('Within budget')

    const over = renderInstallSizeReport({
      totalBytes: 30_000_000,
      assetBytes: 0,
      packageCount: 1,
    })
    expect(over).toContain('**Over budget by')
  })
})

/**
 * A stand-in stdio server: answers `initialize`, lists `tools`, and returns
 * `result` for every call, so the smoke harness's failure paths are covered
 * without building the real package.
 */
async function fakeServer(options: {
  tools: readonly string[]
  callResult: Record<string, unknown>
}): Promise<string> {
  const directory = await temporaryDirectory()
  const script = join(directory, 'server.mjs')
  await writeFile(
    script,
    `import { createInterface } from 'node:readline'
const tools = ${JSON.stringify(options.tools)}.map((name) => ({
  name,
  inputSchema: { type: 'object' },
  outputSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['schemaVersion'],
    properties: { schemaVersion: { const: '1.0.0' } },
  },
}))
const callResult = ${JSON.stringify(options.callResult)}
createInterface({ input: process.stdin }).on('line', (line) => {
  const { id, method } = JSON.parse(line)
  if (id === undefined) return
  const result =
    method === 'initialize'
      ? { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'ghostvue', version: '0.0.0' } }
      : method === 'tools/list'
        ? { tools }
        : callResult
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\\n')
})
`,
  )
  return script
}

const stamp = { version: '0.0.0', assetBundleId: 'sha256:abc' }

describe('runMcpStdioSmoke', () => {
  it('requires exactly the five GhostVue tools', async () => {
    const script = await fakeServer({
      tools: MCP_TOOL_NAMES.slice(1),
      callResult: {},
    })
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: [script],
        cwd: tmpdir(),
        assetBundleId: stamp.assetBundleId,
      }),
    ).rejects.toThrow(/Expected tools get_component, get_examples/)
  })

  it('rejects structured content that breaks the declared outputSchema', async () => {
    const script = await fakeServer({
      tools: MCP_TOOL_NAMES,
      callResult: {
        structuredContent: { schemaVersion: '2.0.0', ghostvue: stamp },
      },
    })
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: [script],
        cwd: tmpdir(),
        assetBundleId: stamp.assetBundleId,
      }),
    ).rejects.toThrow(/list_components structuredContent does not match/)
  })

  it('rejects tool errors and a different asset bundle', async () => {
    const failing = await fakeServer({
      tools: MCP_TOOL_NAMES,
      callResult: { isError: true, content: [{ type: 'text', text: 'boom' }] },
    })
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: [failing],
        cwd: tmpdir(),
        assetBundleId: stamp.assetBundleId,
      }),
    ).rejects.toThrow(/list_components failed: .*boom/)

    const stale = await fakeServer({
      tools: MCP_TOOL_NAMES,
      callResult: {
        structuredContent: { schemaVersion: '1.0.0', ghostvue: stamp },
      },
    })
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: [stale],
        cwd: tmpdir(),
        assetBundleId: 'sha256:other',
      }),
    ).rejects.toThrow(/assetBundleId sha256:abc, expected sha256:other/)
  })

  it('rejects a stamp that names a different manifest schema', async () => {
    const script = await fakeServer({
      tools: MCP_TOOL_NAMES,
      callResult: {
        structuredContent: {
          schemaVersion: '1.0.0',
          ghostvue: {
            ...stamp,
            manifestSchemaId:
              'https://unpkg.com/@ghostvue/core@1/manifest.schema.json',
          },
        },
      },
    })
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: [script],
        cwd: tmpdir(),
        assetBundleId: stamp.assetBundleId,
        manifestSchemaId:
          'https://ghostvue.dev/schemas/v1/manifest.schema.json',
      }),
    ).rejects.toThrow(
      /list_components reported manifestSchemaId https:\/\/unpkg\.com\/.*, expected https:\/\/ghostvue\.dev\/schemas\/v1\/manifest\.schema\.json/,
    )
  })

  it('reports a server that exits before answering', async () => {
    await expect(
      runMcpStdioSmoke({
        command: process.execPath,
        args: ['-e', 'process.stderr.write("no bundle"); process.exit(1)'],
        cwd: tmpdir(),
        assetBundleId: stamp.assetBundleId,
      }),
    ).rejects.toThrow(/exited with 1 early:\nno bundle/)
  })
})
