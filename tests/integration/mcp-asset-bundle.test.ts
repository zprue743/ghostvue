/** @vitest-environment node */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  DocsCorpusPage,
  ExampleCatalogEntry,
} from '../../scripts/lib/mcp-asset-sources.js'
import { loadExampleCatalog } from '../../scripts/lib/mcp-asset-sources.js'
import {
  checkAssetBundle,
  collectAssetBundle,
  computeAssetBundleId,
  readAssetBundle,
  writeAssetBundle,
} from '../../packages/mcp/scripts/lib/asset-bundle.js'

const schema = '{"$id":"https://example.test/manifest.schema.json"}\n'
const tokens = '{"schemaVersion":"1.0.0","tokens":[]}\n'

const gettingStartedPage: DocsCorpusPage = {
  section: 'Getting started',
  title: 'Getting started',
  link: '/getting-started',
  sourcePath: 'docs/getting-started.md',
  h1: 'Getting started',
  description: 'Install GhostVue.',
  body: '# Getting started\n\nInstall GhostVue.',
}
const docsPages: DocsCorpusPage[] = [gettingStartedPage]

const basicExample: ExampleCatalogEntry = {
  id: 'button/basic',
  title: 'Basic',
  description: 'Unstyled button.',
  layer: 'headless',
}
const exampleCatalog: ExampleCatalogEntry[] = [basicExample]

const tempDirs: string[] = []

async function put(root: string, path: string, content: string) {
  const target = join(root, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}

/** Smallest workspace that satisfies every plan §4 source. */
async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-assets-'))
  tempDirs.push(root)
  await put(
    root,
    'packages/vue/manifests/ghost-button.manifest.json',
    '{"name":"GhostButton","examples":["button/basic"]}\n',
  )
  await put(
    root,
    'packages/themes/manifests/ghost-button.manifest.json',
    '{"name":"GhostButton","examples":[]}\n',
  )
  await put(root, 'packages/vue/manifests/README.md', 'not a manifest\n')
  await put(root, 'packages/core/manifest.schema.json', schema)
  await put(root, 'schemas/component-manifest.schema.json', schema)
  await put(root, 'examples/button/basic.vue', '<template>a</template>\n')
  await put(root, 'examples/registry.ts', 'export {}\n')
  await put(root, 'packages/themes/src/generated/tokens.json', tokens)
  await put(root, 'packages/themes/dist/tokens.json', tokens)
  return root
}

function collect(
  repositoryRoot: string,
  overrides: {
    pages?: DocsCorpusPage[]
    catalog?: ExampleCatalogEntry[]
  } = {},
) {
  return collectAssetBundle({
    repositoryRoot,
    loadDocsPages: () => Promise.resolve(overrides.pages ?? docsPages),
    loadExampleCatalog: () =>
      Promise.resolve(overrides.catalog ?? exampleCatalog),
  })
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe('@ghostvue/mcp asset bundle', () => {
  it('maps every plan §4 asset class to its bundled path', async () => {
    const files = await collect(await createWorkspace())

    expect([...files.keys()]).toEqual([
      'docs/pages.json',
      'examples/catalog.json',
      'examples/sources/button/basic.vue',
      'manifest.schema.json',
      'manifests/themes/ghost-button.manifest.json',
      'manifests/vue/ghost-button.manifest.json',
      'tokens.json',
    ])
    expect(files.get('manifest.schema.json')?.toString()).toBe(schema)
    expect(files.get('tokens.json')?.toString()).toBe(tokens)
    expect(
      JSON.parse(files.get('examples/catalog.json')?.toString() ?? ''),
    ).toEqual({
      examples: [{ ...basicExample, sourcePath: 'examples/button/basic.vue' }],
    })
    expect(JSON.parse(files.get('docs/pages.json')?.toString() ?? '')).toEqual({
      pages: docsPages,
    })
  })

  it('derives the same assetBundleId from the same inputs', async () => {
    const first = await collect(await createWorkspace())
    const second = await collect(await createWorkspace())
    const reordered = new Map([...second].reverse())

    expect(computeAssetBundleId(first)).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(computeAssetBundleId(second)).toBe(computeAssetBundleId(first))
    // Insertion order must not matter; only paths and bytes do.
    expect(computeAssetBundleId(reordered)).toBe(computeAssetBundleId(first))
  })

  it('changes the id when any byte, path, or file boundary changes', () => {
    const base = new Map([
      ['a.json', Buffer.from('ab')],
      ['b.json', Buffer.from('c')],
    ])
    const id = computeAssetBundleId(base)

    expect(
      computeAssetBundleId(new Map([...base, ['b.json', Buffer.from('d')]])),
    ).not.toBe(id)
    expect(
      computeAssetBundleId(
        new Map([
          ['a.json', Buffer.from('ab')],
          ['c.json', Buffer.from('c')],
        ]),
      ),
    ).not.toBe(id)
    // Moving a byte across files keeps the concatenation equal; the length
    // framing must still tell the two bundles apart.
    expect(
      computeAssetBundleId(
        new Map([
          ['a.json', Buffer.from('a')],
          ['b.json', Buffer.from('bc')],
        ]),
      ),
    ).not.toBe(id)
  })

  it('writes the bundle with metadata and reports it fresh', async () => {
    const root = await createWorkspace()
    const assetsDir = join(root, 'packages/mcp/dist/assets')
    const files = await collect(root)

    const metadata = await writeAssetBundle(assetsDir, files)
    const written = await readAssetBundle(assetsDir)

    expect(metadata).toEqual({
      format: 'ghostvue-mcp-assets/v1',
      algorithm: 'sha256',
      assetBundleId: computeAssetBundleId(files),
      fileCount: files.size,
    })
    expect(written?.metadata).toEqual(metadata)
    expect(written && computeAssetBundleId(written.files)).toBe(
      metadata.assetBundleId,
    )
    await expect(checkAssetBundle(files, assetsDir)).resolves.toEqual({
      fresh: true,
      expectedId: metadata.assetBundleId,
      actualId: metadata.assetBundleId,
      recordedId: metadata.assetBundleId,
      problems: [],
    })
  })

  it('removes assets whose sources were deleted on rebuild', async () => {
    const root = await createWorkspace()
    const assetsDir = join(root, 'dist/assets')
    await put(assetsDir, 'manifests/vue/ghost-removed.manifest.json', '{}')

    await writeAssetBundle(assetsDir, await collect(root))

    const written = await readAssetBundle(assetsDir)
    expect(
      written?.files.has('manifests/vue/ghost-removed.manifest.json'),
    ).toBe(false)
  })

  it('detects a stale bundle after a manifest or docs change', async () => {
    const root = await createWorkspace()
    const assetsDir = join(root, 'dist/assets')
    const original = await writeAssetBundle(assetsDir, await collect(root))

    await put(
      root,
      'packages/vue/manifests/ghost-button.manifest.json',
      '{"name":"GhostButton","examples":["button/basic"],"status":"beta"}\n',
    )
    await put(
      root,
      'packages/vue/manifests/ghost-card.manifest.json',
      '{"name":"GhostCard","examples":[]}\n',
    )
    const changedDocs = [{ ...gettingStartedPage, body: 'Updated body.' }]
    const expected = await collect(root, { pages: changedDocs })
    const result = await checkAssetBundle(expected, assetsDir)

    expect(result.fresh).toBe(false)
    expect(result.actualId).toBe(original.assetBundleId)
    expect(result.expectedId).not.toBe(original.assetBundleId)
    expect(result.problems).toEqual([
      'stale docs/pages.json',
      'stale manifests/vue/ghost-button.manifest.json',
      'missing manifests/vue/ghost-card.manifest.json',
    ])
  })

  it('detects bundled bytes edited after the build', async () => {
    const root = await createWorkspace()
    const assetsDir = join(root, 'dist/assets')
    const files = await collect(root)
    const { assetBundleId } = await writeAssetBundle(assetsDir, files)

    await put(assetsDir, 'tokens.json', '{"tampered":true}\n')
    await put(assetsDir, 'extra.json', '{}\n')
    const result = await checkAssetBundle(files, assetsDir)

    expect(result.fresh).toBe(false)
    expect(result.recordedId).toBe(assetBundleId)
    expect(result.problems).toContain('stale tokens.json')
    expect(result.problems).toContain('unexpected extra.json')
    expect(result.problems).toContainEqual(
      expect.stringMatching(
        /^bundle\.json records sha256:\S+ but the bundled bytes hash to sha256:/,
      ),
    )
  })

  it('reports a missing bundle directory as stale', async () => {
    const root = await createWorkspace()
    const result = await checkAssetBundle(
      await collect(root),
      join(root, 'dist/assets'),
    )

    expect(result.fresh).toBe(false)
    expect(result.problems[0]).toMatch(/does not exist/)
  })

  it('refuses to build from inconsistent sources', async () => {
    const root = await createWorkspace()
    await put(
      root,
      'packages/vue/manifests/ghost-button.manifest.json',
      '{"name":"GhostButton","examples":["button/missing"]}\n',
    )
    await put(root, 'packages/themes/manifests/broken.manifest.json', '{')
    await put(root, 'schemas/component-manifest.schema.json', '{}\n')
    await put(root, 'examples/button/orphan.vue', '<template />\n')
    await put(root, 'packages/themes/dist/tokens.json', '{"old":true}\n')

    const failure = collect(root, {
      catalog: [
        ...exampleCatalog,
        ...exampleCatalog,
        { ...basicExample, id: 'button/ghost' },
      ],
    })

    await expect(failure).rejects.toThrow(
      [
        'Cannot build the @ghostvue/mcp asset bundle:',
        '  - manifests/themes/broken.manifest.json is not valid JSON',
        '  - packages/core/manifest.schema.json is not byte-equal to schemas/component-manifest.schema.json',
        '  - Example catalog lists button/basic more than once',
        '  - examples/button/orphan.vue has no entry in the example catalog',
        '  - Example catalog id button/ghost has no examples/button/ghost.vue',
        '  - manifests/vue/ghost-button.manifest.json references missing example button/missing',
        '  - packages/themes/dist/tokens.json is stale relative to src/generated/tokens.json; rebuild @ghostvue/themes',
      ].join('\n'),
    )
  })

  it('requires the themes build before bundling tokens', async () => {
    const root = await createWorkspace()
    await rm(join(root, 'packages/themes/dist'), { recursive: true })

    await expect(collect(root)).rejects.toThrow(
      /packages\/themes\/dist\/tokens\.json is missing; run `pnpm --filter @ghostvue\/themes build` first/,
    )
  })

  it('refuses a source file named like the metadata file', async () => {
    await expect(
      writeAssetBundle(
        join(await createWorkspace(), 'assets'),
        new Map([['bundle.json', Buffer.from('{}')]]),
      ),
    ).rejects.toThrow(/reserved/)
  })

  it('bundles a catalog that covers every repository example and manifest reference', async () => {
    const root = resolve(process.cwd())
    const catalog = await loadExampleCatalog(root)
    const ids = new Set(catalog.map((entry) => entry.id))

    expect(catalog.length).toBeGreaterThan(0)
    expect(ids.size).toBe(catalog.length)
    for (const entry of catalog) {
      expect(entry.layer).toMatch(/^(headless|themed)$/)
      await expect(
        readFile(join(root, 'examples', `${entry.id}.vue`), 'utf8'),
      ).resolves.toBeTypeOf('string')
    }
  })
})
