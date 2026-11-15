import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vueRoot = join(root, 'packages/vue')
const indexPath = join(vueRoot, 'src/index.ts')
const publishPath = join(vueRoot, 'src/.publish-index.generated.ts')

const shim = await readFile(indexPath, 'utf8')
const publish = await readFile(publishPath, 'utf8')
await writeFile(indexPath, publish)

const child = spawnSync(process.argv[2], process.argv.slice(3), {
  cwd: vueRoot,
  stdio: 'inherit',
  shell: false,
})

await writeFile(indexPath, shim)
process.exit(child.status ?? 1)
