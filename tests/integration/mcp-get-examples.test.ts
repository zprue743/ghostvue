/** @vitest-environment node */

import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  collectAssetBundle,
  writeAssetBundle,
} from '../../packages/mcp/scripts/lib/asset-bundle.js'
import { type GhostvueStamp } from '../../packages/mcp/src/contract'
import { createGetExamplesTool } from '../../packages/mcp/src/get-examples'
import { loadExampleCatalog } from '../../scripts/lib/mcp-asset-sources.js'

const repositoryRoot = resolve(process.cwd())

const stamp: GhostvueStamp = {
  version: '0.0.0',
  assetBundleId: `sha256:${'0'.repeat(64)}`,
  manifestSchemaId: 'https://ghostvue.dev/schemas/v1/manifest.schema.json',
}

const manifestDirectories = [
  'packages/vue/manifests',
  'packages/themes/manifests',
]

let workspace: string
let assetsDirectory: string

/**
 * Bundles the repository's real manifests, examples, and example catalog
 * with the production bundler, so the tool reads exactly the files a release
 * would ship. Docs and tokens are stubbed: they come from build outputs this
 * test does not need, and `get_examples` never reads them.
 */
beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-examples-'))
  for (const directory of [
    ...manifestDirectories,
    'examples',
    'packages/core/manifest.schema.json',
    'schemas/component-manifest.schema.json',
  ]) {
    await cp(join(repositoryRoot, directory), join(workspace, directory), {
      recursive: true,
    })
  }
  const tokens = '{"tokens":[]}\n'
  for (const path of [
    'packages/themes/dist/tokens.json',
    'packages/themes/src/generated/tokens.json',
  ]) {
    await mkdir(dirname(join(workspace, path)), { recursive: true })
    await writeFile(join(workspace, path), tokens)
  }

  const files = await collectAssetBundle({
    repositoryRoot: workspace,
    loadDocsPages: () => Promise.resolve([]),
    loadExampleCatalog: () => loadExampleCatalog(repositoryRoot),
  })
  assetsDirectory = join(workspace, 'assets')
  await writeAssetBundle(assetsDirectory, files)
})

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true })
})

async function manifestExampleIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const directory of manifestDirectories) {
    for (const name of await readdir(join(repositoryRoot, directory))) {
      if (!name.endsWith('.manifest.json')) continue
      const manifest = JSON.parse(
        await readFile(join(repositoryRoot, directory, name), 'utf8'),
      ) as { examples?: string[] }
      for (const id of manifest.examples ?? []) ids.add(id)
    }
  }
  return ids
}

describe('get_examples over the repository bundle', () => {
  it('resolves every manifest examples id to its bundled source', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: pathToFileURL(`${assetsDirectory}/`),
    })
    const ids = await manifestExampleIds()

    expect(ids.size).toBeGreaterThan(0)
    for (const id of ids) {
      const result = await tool.call({ id }, { stamp }, () => undefined)
      expect(result.isError, `get_examples ${id}`).toBeUndefined()
      expect(result.structuredContent).toMatchObject({
        examples: [
          {
            id,
            sourcePath: `examples/${id}.vue`,
            source: await readFile(
              join(repositoryRoot, 'examples', `${id}.vue`),
              'utf8',
            ),
          },
        ],
      })
    }
  })

  it('lists the whole registry, in order, across catalog pages', async () => {
    const tool = createGetExamplesTool({
      assetsDirectory: pathToFileURL(`${assetsDirectory}/`),
    })
    const catalog = await loadExampleCatalog(repositoryRoot)
    const listed: unknown[] = []
    let cursor: string | undefined
    do {
      const result = await tool.call(
        { limit: 100, ...(cursor === undefined ? {} : { cursor }) },
        { stamp },
        () => undefined,
      )
      const page = result.structuredContent as {
        examples: { id: string; source?: string }[]
        nextCursor: string | null
      }
      for (const example of page.examples) {
        expect(example).not.toHaveProperty('source')
        listed.push(example.id)
      }
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)

    expect(listed).toEqual(catalog.map((entry) => entry.id))
  })
})
