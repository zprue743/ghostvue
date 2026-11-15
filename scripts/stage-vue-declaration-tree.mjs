import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vueRoot = join(root, 'packages/vue')
const srcRoot = join(vueRoot, 'src')
const stageRoot = join(vueRoot, '.declaration-build/src')

const skipNames = new Set([
  'index.ts',
  '.registries',
  '.publish-build',
  '.publish-index.generated.ts',
])

/**
 * @param {string} name
 */
function shouldSkipFile(name) {
  return (
    name.endsWith('.test.ts') ||
    name === 'dev-codes-docs.ts' ||
    name === 'overlay-ssr.test.ts'
  )
}

/**
 * @param {string} sourcePath
 * @param {string} targetPath
 */
async function mirrorPath(sourcePath, targetPath) {
  const stat = await lstat(sourcePath)
  if (stat.isDirectory()) {
    await mkdir(targetPath, { recursive: true })
    for (const child of await readdir(sourcePath)) {
      if (shouldSkipFile(child)) continue
      await mirrorPath(join(sourcePath, child), join(targetPath, child))
    }
    return
  }
  if (shouldSkipFile(basename(sourcePath))) return
  await mkdir(dirname(targetPath), { recursive: true })
  await copyFile(sourcePath, targetPath)
}

await rm(stageRoot, { recursive: true, force: true })
await mkdir(stageRoot, { recursive: true })

const publish = await readFile(
  join(srcRoot, '.publish-index.generated.ts'),
  'utf8',
)
await writeFile(join(stageRoot, 'index.ts'), publish)

for (const name of await readdir(srcRoot)) {
  if (skipNames.has(name)) continue
  await mirrorPath(join(srcRoot, name), join(stageRoot, name))
}
