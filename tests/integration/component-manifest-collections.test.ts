/** @vitest-environment node */

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Ajv2020 from 'ajv/dist/2020'
import { afterEach, describe, expect, it } from 'vitest'

import {
  COLLECTION_EXPORT,
  COLLECTION_EXPORT_TARGET,
  COLLECTION_SCHEMA_VERSION,
  buildManifestCollection,
  buildPackageCollection,
  buildWorkspaceCollection,
  checkBuiltCollections,
  createCollectionValidator,
  listManifestPackages,
  serializeCollection,
  writePackageCollection,
  writeWorkspaceCollection,
} from '../../scripts/lib/component-manifest-collections.js'
import { workspacePackages } from '../../scripts/workspace-packages.mjs'

const repositoryRoot = process.cwd()

function parseJsonObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a JSON object')
  }
  return value
}

async function readJsonObject(path: string): Promise<Record<string, unknown>> {
  return parseJsonObject(await readFile(path, 'utf8'))
}

function identities(components: Record<string, unknown>[]): string[] {
  return components.map(
    (component) => `${String(component.package)} ${String(component.name)}`,
  )
}

function codeUnitSorted(values: string[]): string[] {
  return [...values].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
}

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe('component manifest collection schema', () => {
  it('compiles strictly, references the component schema, and matches the published core export', async () => {
    const canonical = await readFile(
      join(repositoryRoot, 'schemas/component-manifest-collection.schema.json'),
      'utf8',
    )
    const published = await readFile(
      join(repositoryRoot, 'packages/core/manifest-collection.schema.json'),
      'utf8',
    )
    expect(published).toBe(canonical)

    const schema = parseJsonObject(canonical)
    expect(schema['$id']).toBe(
      'https://unpkg.com/@ghostvue/core@1/manifest-collection.schema.json',
    )

    const corePackage = await readJsonObject(
      join(repositoryRoot, 'packages/core/package.json'),
    )
    expect(corePackage.exports).toMatchObject({
      './manifest-collection.schema.json': './manifest-collection.schema.json',
    })

    const ajv = new Ajv2020({ allErrors: true, strict: true })
    ajv.addSchema(
      await readJsonObject(
        join(repositoryRoot, 'schemas/component-manifest.schema.json'),
      ),
    )
    expect(() => ajv.compile(schema)).not.toThrow()
  })

  it('rejects envelopes with unknown keys, extra packages, or invalid components', async () => {
    const validate = await createCollectionValidator(repositoryRoot)
    const { collection } = await buildPackageCollection(repositoryRoot, {
      directory: 'vue',
      name: '@ghostvue/vue',
    })
    expect(validate(collection, 'vue')).toEqual([])

    expect(
      validate({ ...collection, extra: true }, 'unknown key'),
    ).toHaveLength(1)
    expect(
      validate(
        {
          ...collection,
          packages: [
            ...collection.packages,
            { name: '@ghostvue/themes', version: '0.0.0' },
          ],
        },
        'package scope with two packages',
      ),
    ).toHaveLength(1)
    const [first, ...rest] = collection.components
    expect(
      validate(
        {
          ...collection,
          components: [{ ...first, unexpectedField: 1 }, ...rest],
        },
        'invalid component',
      ),
    ).toHaveLength(1)
  })
})

describe('per-package manifest collections', () => {
  it('covers exactly the packages that own component manifests and exports ./manifest.json from each', async () => {
    const manifestPackages = await listManifestPackages(repositoryRoot)
    expect(manifestPackages.map((pkg) => pkg.name)).toEqual([
      '@ghostvue/vue',
      '@ghostvue/themes',
    ])
    for (const pkg of manifestPackages) {
      const packageJson = await readJsonObject(
        join(repositoryRoot, 'packages', pkg.directory, 'package.json'),
      )
      expect(packageJson.exports).toMatchObject({
        [COLLECTION_EXPORT]: COLLECTION_EXPORT_TARGET,
      })
      expect(packageJson.files).toContain('dist')
    }
  })

  it.each([
    { directory: 'vue', name: '@ghostvue/vue' },
    { directory: 'themes', name: '@ghostvue/themes' },
  ])(
    '$name embeds every checked-in manifest unchanged in stable order',
    async (pkg) => {
      const { collection, violations } = await buildPackageCollection(
        repositoryRoot,
        pkg,
      )
      expect(violations).toEqual([])
      expect(collection.schemaVersion).toBe(COLLECTION_SCHEMA_VERSION)
      expect(collection.scope).toBe('package')
      expect(collection.packages).toEqual([
        { name: pkg.name, version: '0.0.0' },
      ])

      const names = collection.components.map((component) =>
        String(component.name),
      )
      expect(names).toEqual(codeUnitSorted(names))
      expect(new Set(names).size).toBe(names.length)
      expect(
        collection.components.every(
          (component) => component.package === pkg.name,
        ),
      ).toBe(true)

      // Compact-JSON comparison checks values and key order (some handwritten
      // files use their own whitespace): the envelope must not rewrite,
      // re-derive, or drop fields from any component manifest.
      for (const component of collection.components) {
        const kebab = String(component.name)
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
        const source = await readFile(
          join(
            repositoryRoot,
            'packages',
            pkg.directory,
            'manifests',
            `${kebab}.manifest.json`,
          ),
          'utf8',
        )
        expect(JSON.stringify(component)).toBe(
          JSON.stringify(JSON.parse(source)),
        )
      }
    },
  )
})

describe('workspace manifest collection', () => {
  it('is the union of package collections sorted by package, then component', async () => {
    const { collection, violations } =
      await buildWorkspaceCollection(repositoryRoot)
    expect(violations).toEqual([])
    expect(collection.scope).toBe('workspace')
    expect(collection.packages.map((pkg) => pkg.name)).toEqual([
      '@ghostvue/themes',
      '@ghostvue/vue',
    ])

    const ids = identities(collection.components)
    expect(ids).toEqual(codeUnitSorted(ids))
    expect(new Set(ids).size).toBe(ids.length)
    // The same component name may appear once per package (headless + themed).
    expect(ids).toEqual(
      expect.arrayContaining([
        '@ghostvue/themes GhostButton',
        '@ghostvue/vue GhostButton',
      ]),
    )

    const themes = await buildPackageCollection(repositoryRoot, {
      directory: 'themes',
      name: '@ghostvue/themes',
    })
    const vue = await buildPackageCollection(repositoryRoot, {
      directory: 'vue',
      name: '@ghostvue/vue',
    })
    expect(collection.components).toEqual([
      ...themes.collection.components,
      ...vue.collection.components,
    ])
    expect(
      (await createCollectionValidator(repositoryRoot))(collection, 'ws'),
    ).toEqual([])
  })
})

describe('buildManifestCollection', () => {
  const packages = [
    { name: '@ghostvue/vue', version: '1.2.3' },
    { name: '@ghostvue/themes', version: '1.2.3' },
  ]
  const manifest = (pkg: string, name: string) => ({ package: pkg, name })

  it('orders deterministically regardless of input order', () => {
    const entries = [
      { file: 'c', manifest: manifest('@ghostvue/vue', 'GhostTabs') },
      { file: 'a', manifest: manifest('@ghostvue/themes', 'GhostTabs') },
      { file: 'b', manifest: manifest('@ghostvue/vue', 'GhostButton') },
      { file: 'd', manifest: manifest('@ghostvue/vue', 'GhostButtonGroup') },
    ]
    const forward = buildManifestCollection({
      scope: 'workspace',
      packages,
      entries,
    })
    const reversed = buildManifestCollection({
      scope: 'workspace',
      packages: [...packages].reverse(),
      entries: [...entries].reverse(),
    })
    expect(forward.violations).toEqual([])
    expect(serializeCollection(forward.collection)).toBe(
      serializeCollection(reversed.collection),
    )
    expect(identities(forward.collection.components)).toEqual([
      '@ghostvue/themes GhostTabs',
      '@ghostvue/vue GhostButton',
      '@ghostvue/vue GhostButtonGroup',
      '@ghostvue/vue GhostTabs',
    ])
    expect(forward.collection.packages.map((pkg) => pkg.name)).toEqual([
      '@ghostvue/themes',
      '@ghostvue/vue',
    ])
  })

  it('rejects duplicate (package, component) identities', () => {
    const { violations } = buildManifestCollection({
      scope: 'workspace',
      packages,
      entries: [
        { file: 'one.json', manifest: manifest('@ghostvue/vue', 'GhostTabs') },
        { file: 'two.json', manifest: manifest('@ghostvue/vue', 'GhostTabs') },
        {
          file: 'three.json',
          manifest: manifest('@ghostvue/themes', 'GhostTabs'),
        },
      ],
    })
    expect(violations).toEqual([
      'two.json: duplicate component identity (@ghostvue/vue, GhostTabs) also declared by one.json',
    ])
  })

  it('rejects components that belong to a package outside the collection', () => {
    const { violations } = buildManifestCollection({
      scope: 'package',
      packages: [{ name: '@ghostvue/vue', version: '1.0.0' }],
      entries: [
        {
          file: 'stray.json',
          manifest: manifest('@ghostvue/themes', 'GhostTabs'),
        },
      ],
    })
    expect(violations).toEqual([
      'stray.json: package "@ghostvue/themes" is not one of @ghostvue/vue',
    ])
  })
})

describe('built collection check', () => {
  async function fixtureRepository() {
    const root = await mkdtemp(join(tmpdir(), 'ghost-collections-'))
    temporaryDirectories.push(root)
    await cp(join(repositoryRoot, 'schemas'), join(root, 'schemas'), {
      recursive: true,
    })
    await mkdir(join(root, 'packages/vue/manifests'), { recursive: true })
    await cp(
      join(repositoryRoot, 'packages/vue/manifests/ghost-button.manifest.json'),
      join(root, 'packages/vue/manifests/ghost-button.manifest.json'),
    )
    await writeFile(
      join(root, 'packages/vue/package.json'),
      JSON.stringify({
        name: '@ghostvue/vue',
        version: '2.0.0',
        exports: { [COLLECTION_EXPORT]: COLLECTION_EXPORT_TARGET },
        files: ['dist'],
      }),
    )
    // A package without manifests must not be required to export a collection.
    await mkdir(join(root, 'packages/core'), { recursive: true })
    await writeFile(
      join(root, 'packages/core/package.json'),
      JSON.stringify({ name: '@ghostvue/core', version: '2.0.0' }),
    )
    return root
  }

  const packages = workspacePackages.filter(
    (pkg) => pkg.directory === 'vue' || pkg.directory === 'core',
  )

  it('fails before build, passes after writing, and catches stale output', async () => {
    const root = await fixtureRepository()

    expect(await checkBuiltCollections(root, packages)).toEqual([
      '@ghostvue/vue ./dist/manifest.json is missing. Run pnpm build',
      'dist/manifest.json is missing. Run pnpm build',
    ])

    expect(
      await writePackageCollection(root, {
        directory: 'vue',
        name: '@ghostvue/vue',
      }),
    ).toEqual([])
    expect(await writeWorkspaceCollection(root, packages)).toEqual([])
    expect(await checkBuiltCollections(root, packages)).toEqual([])

    const built = await readJsonObject(
      join(root, 'packages/vue/dist/manifest.json'),
    )
    expect(built.packages).toEqual([
      { name: '@ghostvue/vue', version: '2.0.0' },
    ])

    const manifestPath = join(
      root,
      'packages/vue/manifests/ghost-button.manifest.json',
    )
    const source = await readJsonObject(manifestPath)
    await writeFile(
      manifestPath,
      `${JSON.stringify({ ...source, status: 'beta' }, null, 2)}\n`,
    )
    expect(await checkBuiltCollections(root, packages)).toEqual([
      '@ghostvue/vue ./dist/manifest.json is stale versus the source manifests. Run pnpm build',
      'dist/manifest.json is stale versus the source manifests. Run pnpm build',
    ])
  })

  it('requires the ./manifest.json export on packages with manifests', async () => {
    const root = await fixtureRepository()
    await writeFile(
      join(root, 'packages/vue/package.json'),
      JSON.stringify({ name: '@ghostvue/vue', version: '2.0.0', exports: {} }),
    )
    await writePackageCollection(root, {
      directory: 'vue',
      name: '@ghostvue/vue',
    })
    await writeWorkspaceCollection(root, packages)
    expect(await checkBuiltCollections(root, packages)).toEqual([
      '@ghostvue/vue must export "./manifest.json": "./dist/manifest.json" because it has component manifests',
    ])
  })

  it('refuses to write a collection that fails schema validation', async () => {
    const root = await fixtureRepository()
    const manifestPath = join(
      root,
      'packages/vue/manifests/ghost-button.manifest.json',
    )
    const source = await readJsonObject(manifestPath)
    await writeFile(manifestPath, JSON.stringify({ ...source, status: 'gone' }))
    const violations = await writePackageCollection(root, {
      directory: 'vue',
      name: '@ghostvue/vue',
    })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('packages/vue/dist/manifest.json')
  })
})
