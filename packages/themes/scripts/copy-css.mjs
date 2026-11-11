import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(packageRoot, 'src/default.css')
const outputPath = resolve(packageRoot, 'dist/default.css')

// Copy as authored. Minifying would need a new runtime dependency, and the
// cascade-layer comments are part of the public theme contract.
await mkdir(dirname(outputPath), { recursive: true })
await copyFile(sourcePath, outputPath)
