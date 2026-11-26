import { access, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Vite/esbuild use the shim `index.ts`; publish typings and themes ESM entry
// come from `.publish-index.generated.*` so dist stays byte-stable. The publish
// build emits no source maps (tsconfig.build.json), so there is no map to rename.
const dist = resolve(process.argv[2])
const publishStem = '.publish-index.generated'
const stagedPublishDir = join(dist, '.publish-build')
const stagedIndexTypes = join(stagedPublishDir, 'index.d.ts')

/** @param {string} from @param {string} to */
async function renamePublishArtifact(from, to) {
  try {
    await rename(from, to)
    return true
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT')
      return false
    throw error
  }
}

const publishTypes = join(dist, `${publishStem}.d.ts`)
const indexTypes = join(dist, 'index.d.ts')
const hasStagedIndex = await access(stagedIndexTypes)
  .then(() => true)
  .catch(() => false)
if (hasStagedIndex) {
  await renamePublishArtifact(stagedIndexTypes, indexTypes)
} else {
  await renamePublishArtifact(publishTypes, indexTypes)
}
try {
  let types = await readFile(indexTypes, 'utf8')
  types = types
    .replaceAll(`${publishStem}.js`, 'index.js')
    .replaceAll('.publish-build/index.js', 'index.js')
  await writeFile(indexTypes, types)
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT')
    throw error
}
await renamePublishArtifact(
  join(dist, `${publishStem}.js`),
  join(dist, 'index.js'),
)
await rm(join(dist, '.registries'), { recursive: true, force: true })
await rm(stagedPublishDir, { recursive: true, force: true })
