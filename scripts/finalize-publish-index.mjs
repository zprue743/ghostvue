import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Vite/esbuild use the shim `index.ts`; publish typings and themes ESM entry
// come from `.publish-index.generated.*` so dist stays byte-stable.
const dist = resolve(process.argv[2])
const publishStem = '.publish-index.generated'

/** @param {string} from @param {string} to */
async function renamePublishArtifact(from, to) {
  try {
    await rename(from, to)
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error
  }
}

await renamePublishArtifact(
  join(dist, `${publishStem}.d.ts`),
  join(dist, 'index.d.ts'),
)
await renamePublishArtifact(
  join(dist, `${publishStem}.js`),
  join(dist, 'index.js'),
)
await renamePublishArtifact(
  join(dist, `${publishStem}.js.map`),
  join(dist, 'index.js.map'),
)

const indexJs = join(dist, 'index.js')
try {
  let source = await readFile(indexJs, 'utf8')
  source = source.replace(
    `//# sourceMappingURL=${publishStem}.js.map`,
    '//# sourceMappingURL=index.js.map',
  )
  await writeFile(indexJs, source)
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error
}

const indexMap = join(dist, 'index.js.map')
try {
  let map = await readFile(indexMap, 'utf8')
  map = map
    .replace(`"file":"${publishStem}.js"`, '"file":"index.js"')
    .replaceAll(`${publishStem}.ts`, 'index.ts')
  await writeFile(indexMap, map)
} catch (error) {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error
}

await rm(join(dist, '.registries'), { recursive: true, force: true })