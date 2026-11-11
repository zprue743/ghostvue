import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(packageRoot, 'src/default.css')
const outputPath = resolve(packageRoot, 'dist/default.css')

// Copy as authored: minify would add a dependency, and layer comments are public.
await mkdir(dirname(outputPath), { recursive: true })
await copyFile(sourcePath, outputPath)
