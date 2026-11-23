/**
 * Offline asset bundle for `@ghostvue/mcp` (GHO-17 plan §4, decision M1).
 *
 * The bundle is a flat map of POSIX paths (relative to `dist/assets/`) to
 * bytes. It is regenerated from monorepo sources on every package build, so
 * there is no committed lock hash for docs-only changes to bump. Freshness is
 * instead proven by recomputing the bundle from sources and comparing its
 * `assetBundleId` with what `dist/assets/` holds (`--check`).
 *
 * Sources that only exist as TypeScript modules (docs corpus, example
 * catalog) are injected by the caller, which keeps this module free of Vite
 * and lets tests run it against small fixture workspaces.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

/** Hash function behind `assetBundleId`; documented in the package README. */
export const ASSET_BUNDLE_ALGORITHM = 'sha256'

/**
 * Domain tag hashed before any file, so a future change to the framing below
 * can never collide with an id produced by this version.
 */
export const ASSET_BUNDLE_FORMAT = 'ghostvue-mcp-assets/v1'

/**
 * Bundle metadata file written next to the assets. It records the id and is
 * therefore excluded from the hashed file set.
 */
export const ASSET_BUNDLE_METADATA_FILE = 'bundle.json'

/** Per-package manifest directories, in bundle order (plan §4). */
const MANIFEST_SOURCES = [
  { directory: 'vue', bundleDirectory: 'manifests/vue' },
  { directory: 'themes', bundleDirectory: 'manifests/themes' },
]

const MANIFEST_SUFFIX = '.manifest.json'

/**
 * @param {string} path
 */
function toPosix(path) {
  return path.replaceAll('\\', '/')
}

/**
 * JSON assets are compact: they are machine-read by the server, and the
 * trailing newline keeps byte output stable across editors and tools.
 *
 * @param {unknown} value
 */
function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8')
}

/**
 * @param {string} path
 * @returns {Promise<Buffer | undefined>}
 */
async function readOptional(path) {
  try {
    return await readFile(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

/**
 * Lists files below `root` (recursively), as sorted POSIX paths relative to it.
 *
 * @param {string} root
 * @returns {Promise<string[]>}
 */
async function listFiles(root) {
  /** @type {string[]} */
  const files = []
  /**
   * @param {string} directory
   */
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (entry.isFile()) {
        files.push(toPosix(relative(root, path)))
      }
    }
  }
  await walk(root)
  return files.sort(comparePaths)
}

/**
 * Code-unit order, independent of locale, so every machine hashes files in
 * the same sequence.
 *
 * @param {string} left
 * @param {string} right
 */
function comparePaths(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

/**
 * Collects every bundled asset from the monorepo and validates the
 * cross-asset invariants the server relies on. Throws one error that lists
 * every problem found, so a broken build reports all of them at once.
 *
 * @param {import('./asset-bundle.js').CollectAssetBundleOptions} options
 * @returns {Promise<Map<string, Buffer>>}
 */
export async function collectAssetBundle({
  repositoryRoot,
  loadDocsPages,
  loadExampleCatalog,
}) {
  /** @type {Map<string, Buffer>} */
  const files = new Map()
  /** @type {string[]} */
  const problems = []
  /** @type {{ path: string; examples: string[] }[]} */
  const manifestExampleRefs = []

  for (const source of MANIFEST_SOURCES) {
    const directory = join(
      repositoryRoot,
      'packages',
      source.directory,
      'manifests',
    )
    const names = (await readdir(directory))
      .filter((name) => name.endsWith(MANIFEST_SUFFIX))
      .sort(comparePaths)
    for (const name of names) {
      const bytes = await readFile(join(directory, name))
      // Manifests are copied byte-for-byte; parsing is only for validation.
      // The `<family>.manifest.json` name is kept so bundle paths match the
      // `manifestPath` identity in plan §3.2.
      const bundlePath = `${source.bundleDirectory}/${name}`
      /** @type {{ examples?: unknown }} */
      let manifest
      try {
        manifest = JSON.parse(bytes.toString('utf8'))
      } catch {
        problems.push(`${bundlePath} is not valid JSON`)
        continue
      }
      const examples = Array.isArray(manifest.examples)
        ? manifest.examples.filter((id) => typeof id === 'string')
        : []
      manifestExampleRefs.push({ path: bundlePath, examples })
      files.set(bundlePath, bytes)
    }
  }

  // `@ghostvue/core` publishes a copy of the canonical schema; the server
  // validates against the bundled copy, so drift would silently change rules.
  const schema = await readFile(
    join(repositoryRoot, 'packages/core/manifest.schema.json'),
  )
  const canonicalSchema = await readOptional(
    join(repositoryRoot, 'schemas/component-manifest.schema.json'),
  )
  if (!canonicalSchema || !schema.equals(canonicalSchema)) {
    problems.push(
      'packages/core/manifest.schema.json is not byte-equal to schemas/component-manifest.schema.json',
    )
  }
  files.set('manifest.schema.json', schema)

  const catalog = await loadExampleCatalog()
  const catalogIds = new Set()
  for (const entry of catalog) {
    if (catalogIds.has(entry.id)) {
      problems.push(`Example catalog lists ${entry.id} more than once`)
    }
    catalogIds.add(entry.id)
  }
  files.set(
    'examples/catalog.json',
    jsonBytes({
      examples: catalog.map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        layer: entry.layer,
        sourcePath: `examples/${entry.id}.vue`,
      })),
    }),
  )

  // Catalog and sources must match one-to-one: `get_examples` lists catalog
  // metadata and serves the source by id, so either side alone is a bug.
  const examplesRoot = join(repositoryRoot, 'examples')
  const sourceIds = new Set()
  for (const path of await listFiles(examplesRoot)) {
    if (!path.endsWith('.vue')) continue
    const id = path.slice(0, -'.vue'.length)
    sourceIds.add(id)
    if (!catalogIds.has(id)) {
      problems.push(`examples/${path} has no entry in the example catalog`)
      continue
    }
    files.set(
      `examples/sources/${id}.vue`,
      await readFile(join(examplesRoot, path)),
    )
  }
  for (const id of catalogIds) {
    if (!sourceIds.has(id)) {
      problems.push(`Example catalog id ${id} has no examples/${id}.vue`)
    }
  }
  for (const { path, examples } of manifestExampleRefs) {
    for (const id of examples) {
      if (!catalogIds.has(id) || !sourceIds.has(id)) {
        problems.push(`${path} references missing example ${id}`)
      }
    }
  }

  const pages = await loadDocsPages()
  files.set('docs/pages.json', jsonBytes({ pages }))

  // The token catalog ships from the themes build output (plan §3.5). A
  // missing or outdated copy means the themes build did not run first.
  const tokens = await readOptional(
    join(repositoryRoot, 'packages/themes/dist/tokens.json'),
  )
  const generatedTokens = await readOptional(
    join(repositoryRoot, 'packages/themes/src/generated/tokens.json'),
  )
  if (!tokens) {
    problems.push(
      'packages/themes/dist/tokens.json is missing; run `pnpm --filter @ghostvue/themes build` first',
    )
  } else {
    if (!generatedTokens || !tokens.equals(generatedTokens)) {
      problems.push(
        'packages/themes/dist/tokens.json is stale relative to src/generated/tokens.json; rebuild @ghostvue/themes',
      )
    }
    files.set('tokens.json', tokens)
  }

  if (problems.length > 0) {
    throw new Error(
      `Cannot build the @ghostvue/mcp asset bundle:\n${problems
        .map((problem) => `  - ${problem}`)
        .join('\n')}`,
    )
  }

  return sortBundle(files)
}

/**
 * @param {Map<string, Buffer>} files
 */
function sortBundle(files) {
  return new Map(
    [...files].sort(([left], [right]) => comparePaths(left, right)),
  )
}

/**
 * Deterministic id over every bundled byte. Files are hashed in code-unit
 * path order, each framed as `path NUL byteLength NUL bytes`, after the
 * format tag and a NUL. The length framing keeps two different file sets from
 * ever producing the same byte stream.
 *
 * @param {ReadonlyMap<string, Uint8Array>} files
 * @returns {string}
 */
export function computeAssetBundleId(files) {
  const hash = createHash(ASSET_BUNDLE_ALGORITHM)
  hash.update(`${ASSET_BUNDLE_FORMAT}\0`)
  const paths = [...files.keys()].sort(comparePaths)
  for (const path of paths) {
    const bytes = /** @type {Uint8Array} */ (files.get(path))
    hash.update(`${path}\0${bytes.byteLength}\0`)
    hash.update(bytes)
  }
  return `${ASSET_BUNDLE_ALGORITHM}:${hash.digest('hex')}`
}

/**
 * Replaces `assetsDir` with the bundle plus its `bundle.json` metadata.
 *
 * @param {string} assetsDir
 * @param {ReadonlyMap<string, Uint8Array>} files
 * @returns {Promise<import('./asset-bundle.js').AssetBundleMetadata>}
 */
export async function writeAssetBundle(assetsDir, files) {
  if (files.has(ASSET_BUNDLE_METADATA_FILE)) {
    throw new Error(`${ASSET_BUNDLE_METADATA_FILE} is reserved for metadata`)
  }
  // Removing first keeps renamed or deleted sources from lingering in dist.
  await rm(assetsDir, { recursive: true, force: true })
  for (const [path, bytes] of files) {
    const target = join(assetsDir, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }
  const metadata = {
    format: ASSET_BUNDLE_FORMAT,
    algorithm: ASSET_BUNDLE_ALGORITHM,
    assetBundleId: computeAssetBundleId(files),
    fileCount: files.size,
  }
  await mkdir(assetsDir, { recursive: true })
  await writeFile(
    join(assetsDir, ASSET_BUNDLE_METADATA_FILE),
    `${JSON.stringify(metadata, null, 2)}\n`,
  )
  return metadata
}

/**
 * Reads a written bundle back. Returns `undefined` when `assetsDir` is absent.
 *
 * @param {string} assetsDir
 * @returns {Promise<{ files: Map<string, Buffer>; metadata: Partial<import('./asset-bundle.js').AssetBundleMetadata> | undefined } | undefined>}
 */
export async function readAssetBundle(assetsDir) {
  /** @type {string[]} */
  let paths
  try {
    paths = await listFiles(assetsDir)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
  /** @type {Map<string, Buffer>} */
  const files = new Map()
  let metadata
  for (const path of paths) {
    const bytes = await readFile(join(assetsDir, path))
    if (path === ASSET_BUNDLE_METADATA_FILE) {
      try {
        metadata = JSON.parse(bytes.toString('utf8'))
      } catch {
        metadata = {}
      }
      continue
    }
    files.set(path, bytes)
  }
  return { files, metadata }
}

/**
 * Compares the bundle on disk with the one the current sources produce.
 *
 * @param {ReadonlyMap<string, Uint8Array>} expected
 * @param {string} assetsDir
 * @returns {Promise<import('./asset-bundle.js').AssetBundleCheck>}
 */
export async function checkAssetBundle(expected, assetsDir) {
  const expectedId = computeAssetBundleId(expected)
  const written = await readAssetBundle(assetsDir)
  if (!written) {
    return {
      fresh: false,
      expectedId,
      problems: [`${assetsDir} does not exist; build @ghostvue/mcp first`],
    }
  }

  const actualId = computeAssetBundleId(written.files)
  const recordedId = written.metadata?.assetBundleId
  /** @type {string[]} */
  const problems = []
  for (const [path, bytes] of expected) {
    const actual = written.files.get(path)
    if (!actual) {
      problems.push(`missing ${path}`)
    } else if (!Buffer.from(actual).equals(Buffer.from(bytes))) {
      problems.push(`stale ${path}`)
    }
  }
  for (const path of written.files.keys()) {
    if (!expected.has(path)) problems.push(`unexpected ${path}`)
  }
  if (recordedId !== actualId) {
    problems.push(
      `${ASSET_BUNDLE_METADATA_FILE} records ${String(recordedId)} but the bundled bytes hash to ${actualId}`,
    )
  }

  return {
    fresh: problems.length === 0 && actualId === expectedId,
    expectedId,
    actualId,
    ...(typeof recordedId === 'string' ? { recordedId } : {}),
    problems,
  }
}
