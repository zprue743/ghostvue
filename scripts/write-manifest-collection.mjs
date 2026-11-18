/**
 * Writes component manifest collections during `pnpm build`.
 *
 * `--package <name>` writes `packages/<dir>/dist/manifest.json`, the target of
 * that package's public `./manifest.json` export. `--workspace` writes the
 * unpublished repository-root `dist/manifest.json`. Both validate against
 * `schemas/component-manifest-collection.schema.json` before writing.
 */
import { fileURLToPath } from 'node:url'

import {
  WORKSPACE_COLLECTION_PATH,
  writePackageCollection,
  writeWorkspaceCollection,
} from './lib/component-manifest-collections.js'
import { workspacePackages } from './workspace-packages.mjs'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const packageIndex = args.indexOf('--package')

let violations
let written
if (args.includes('--workspace')) {
  violations = await writeWorkspaceCollection(repositoryRoot)
  written = WORKSPACE_COLLECTION_PATH
} else if (packageIndex !== -1) {
  const name = args[packageIndex + 1]
  const pkg = workspacePackages.find((candidate) => candidate.name === name)
  if (!pkg) {
    console.error(`Unknown workspace package: ${String(name)}`)
    process.exit(1)
  }
  violations = await writePackageCollection(repositoryRoot, pkg)
  written = `packages/${pkg.directory}/dist/manifest.json`
} else {
  console.error(
    'Usage: write-manifest-collection.mjs --package <@ghostvue/name> | --workspace',
  )
  process.exit(1)
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Wrote ${written}.`)
}
