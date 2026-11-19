/**
 * Builds, validates, and checks component manifest collections (GHO-60).
 *
 * A collection is a versioned envelope around component manifests. Each
 * component package publishes one at `<package>/manifest.json`
 * (`dist/manifest.json`), and the root build writes an unpublished workspace
 * collection at `dist/manifest.json` in the repository root.
 *
 * Component manifests are embedded exactly as checked in: this module never
 * rewrites or re-derives them, so fields added to the component schema later
 * flow through without changes here. Generation of the per-component files
 * stays in `component-manifests.js`.
 *
 * `.js` rather than `.mjs` so TypeScript can attach the sibling `.d.ts` when
 * tests import this module.
 */
import { access, glob, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'

import Ajv2020 from 'ajv/dist/2020.js'

import { workspacePackages } from '../workspace-packages.mjs'

/** Envelope schema version; independent of each manifest's `schemaVersion`. */
export const COLLECTION_SCHEMA_VERSION = '1.0.0'

/** Package export subpath and its built target for per-package collections. */
export const COLLECTION_EXPORT = './manifest.json'
export const COLLECTION_EXPORT_TARGET = './dist/manifest.json'

/** Unpublished workspace collection, relative to the repository root. */
export const WORKSPACE_COLLECTION_PATH = 'dist/manifest.json'

const COMPONENT_SCHEMA_PATH = 'schemas/component-manifest.schema.json'
const COLLECTION_SCHEMA_PATH =
  'schemas/component-manifest-collection.schema.json'

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readJsonObject(path) {
  const value = JSON.parse(await readFile(path, 'utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object`)
  }
  return value
}

/**
 * Code-unit comparison rather than a locale collator: the order is part of a
 * published artifact and must not depend on the build machine's ICU data.
 */
function compareStrings(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

/** Sort key for collection components: package, then component name. */
export function compareComponentIdentity(left, right) {
  return (
    compareStrings(String(left.package), String(right.package)) ||
    compareStrings(String(left.name), String(right.name))
  )
}

export function serializeCollection(collection) {
  return `${JSON.stringify(collection, null, 2)}\n`
}

/**
 * Workspace packages that own component manifests. A package qualifies by
 * having at least one `manifests/*.manifest.json`, so a new component package
 * is picked up without registering it in a second list.
 */
export async function listManifestPackages(
  repositoryRoot,
  packages = workspacePackages,
) {
  const result = []
  for (const pkg of packages) {
    const files = await listPackageManifestFiles(repositoryRoot, pkg)
    if (files.length > 0) result.push(pkg)
  }
  return result
}

async function listPackageManifestFiles(repositoryRoot, pkg) {
  const manifestsDir = join(
    repositoryRoot,
    'packages',
    pkg.directory,
    'manifests',
  )
  if (!(await fileExists(manifestsDir))) return []
  const files = []
  for await (const file of glob('*.manifest.json', { cwd: manifestsDir })) {
    files.push(posix.join('packages', pkg.directory, 'manifests', file))
  }
  return files.sort()
}

async function readPackageIdentity(repositoryRoot, pkg) {
  const packageJson = await readJsonObject(
    join(repositoryRoot, 'packages', pkg.directory, 'package.json'),
  )
  return {
    name: String(packageJson.name),
    version: String(packageJson.version),
  }
}

/**
 * Assemble a collection from already-read manifests. Pure: the caller decides
 * where the manifests came from. Returns violations instead of throwing so
 * check mode can report every problem at once.
 *
 * @param {{
 *   scope: 'package' | 'workspace',
 *   packages: { name: string, version: string }[],
 *   entries: { file: string, manifest: Record<string, unknown> }[],
 * }} input
 */
export function buildManifestCollection({ scope, packages, entries }) {
  const violations = []
  const packageNames = new Set(packages.map((pkg) => pkg.name))
  const seen = new Map()

  for (const { file, manifest } of entries) {
    const identity = `${String(manifest.package)} ${String(manifest.name)}`
    if (!packageNames.has(String(manifest.package))) {
      violations.push(
        `${file}: package "${String(manifest.package)}" is not one of ${[...packageNames].join(', ')}`,
      )
    }
    const previous = seen.get(identity)
    if (previous) {
      violations.push(
        `${file}: duplicate component identity (${String(manifest.package)}, ${String(manifest.name)}) also declared by ${previous}`,
      )
    } else {
      seen.set(identity, file)
    }
  }

  const components = entries
    .map((entry) => entry.manifest)
    .sort(compareComponentIdentity)

  return {
    violations,
    collection: {
      schemaVersion: COLLECTION_SCHEMA_VERSION,
      scope,
      packages: [...packages].sort((left, right) =>
        compareStrings(left.name, right.name),
      ),
      components,
    },
  }
}

async function readEntries(repositoryRoot, pkg) {
  const files = await listPackageManifestFiles(repositoryRoot, pkg)
  return Promise.all(
    files.map(async (file) => ({
      file,
      manifest: await readJsonObject(join(repositoryRoot, file)),
    })),
  )
}

/**
 * Per-package collection published as `<package>/manifest.json`.
 *
 * @param {string} repositoryRoot
 * @param {{ directory: string, name: string }} pkg
 */
export async function buildPackageCollection(repositoryRoot, pkg) {
  const identity = await readPackageIdentity(repositoryRoot, pkg)
  return buildManifestCollection({
    scope: 'package',
    packages: [identity],
    entries: await readEntries(repositoryRoot, pkg),
  })
}

/** Workspace collection: every manifest package, read from source manifests. */
export async function buildWorkspaceCollection(
  repositoryRoot,
  packages = workspacePackages,
) {
  const manifestPackages = await listManifestPackages(repositoryRoot, packages)
  const identities = []
  const entries = []
  for (const pkg of manifestPackages) {
    identities.push(await readPackageIdentity(repositoryRoot, pkg))
    entries.push(...(await readEntries(repositoryRoot, pkg)))
  }
  return buildManifestCollection({
    scope: 'workspace',
    packages: identities,
    entries,
  })
}

/**
 * Ajv validator for collections. The component schema is registered by `$id`
 * so each embedded manifest is checked against the unchanged component schema.
 */
export async function createCollectionValidator(repositoryRoot) {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  ajv.addSchema(
    await readJsonObject(join(repositoryRoot, COMPONENT_SCHEMA_PATH)),
  )
  const validate = ajv.compile(
    await readJsonObject(join(repositoryRoot, COLLECTION_SCHEMA_PATH)),
  )
  return (collection, label) =>
    validate(collection) ? [] : [`${label}: ${ajv.errorsText(validate.errors)}`]
}

export function packageCollectionPath(repositoryRoot, pkg) {
  return join(
    repositoryRoot,
    'packages',
    pkg.directory,
    'dist',
    'manifest.json',
  )
}

async function writeValidated(path, label, built, validate) {
  const violations = [...built.violations, ...validate(built.collection, label)]
  if (violations.length > 0) return violations
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, serializeCollection(built.collection))
  return []
}

/**
 * Write one package's `dist/manifest.json`. Runs at the end of that package's
 * `build` script so the file survives Vite emptying `dist`.
 */
export async function writePackageCollection(repositoryRoot, pkg) {
  const validate = await createCollectionValidator(repositoryRoot)
  return writeValidated(
    packageCollectionPath(repositoryRoot, pkg),
    posix.join('packages', pkg.directory, 'dist/manifest.json'),
    await buildPackageCollection(repositoryRoot, pkg),
    validate,
  )
}

/** Write the unpublished workspace collection at the repository root. */
export async function writeWorkspaceCollection(
  repositoryRoot,
  packages = workspacePackages,
) {
  const validate = await createCollectionValidator(repositoryRoot)
  return writeValidated(
    join(repositoryRoot, WORKSPACE_COLLECTION_PATH),
    WORKSPACE_COLLECTION_PATH,
    await buildWorkspaceCollection(repositoryRoot, packages),
    validate,
  )
}

async function checkBuiltFile(path, label, built, validate) {
  if (!(await fileExists(path))) {
    return [`${label} is missing. Run pnpm build`]
  }
  const violations = [...built.violations]
  const text = await readFile(path, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return [`${label} is not valid JSON. Run pnpm build`]
  }
  violations.push(...validate(parsed, label))
  if (text !== serializeCollection(built.collection)) {
    violations.push(
      `${label} is stale versus the source manifests. Run pnpm build`,
    )
  }
  return violations
}

/**
 * Post-build gate used by `pnpm published-exports`: every manifest package
 * exports `./manifest.json` -> `./dist/manifest.json`, the built files validate
 * against the collection schema, and they match the checked-in manifests.
 */
export async function checkBuiltCollections(
  repositoryRoot,
  packages = workspacePackages,
) {
  const validate = await createCollectionValidator(repositoryRoot)
  const violations = []

  for (const pkg of await listManifestPackages(repositoryRoot, packages)) {
    const packageJson = await readJsonObject(
      join(repositoryRoot, 'packages', pkg.directory, 'package.json'),
    )
    const target = packageJson.exports?.[COLLECTION_EXPORT]
    if (target !== COLLECTION_EXPORT_TARGET) {
      violations.push(
        `${pkg.name} must export "${COLLECTION_EXPORT}": "${COLLECTION_EXPORT_TARGET}" because it has component manifests`,
      )
    }
    violations.push(
      ...(await checkBuiltFile(
        packageCollectionPath(repositoryRoot, pkg),
        `${pkg.name} ${COLLECTION_EXPORT_TARGET}`,
        await buildPackageCollection(repositoryRoot, pkg),
        validate,
      )),
    )
  }

  violations.push(
    ...(await checkBuiltFile(
      join(repositoryRoot, WORKSPACE_COLLECTION_PATH),
      WORKSPACE_COLLECTION_PATH,
      await buildWorkspaceCollection(repositoryRoot, packages),
      validate,
    )),
  )
  return violations
}
