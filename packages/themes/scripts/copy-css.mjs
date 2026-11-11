import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(packageRoot, 'src/default.css')
const tokensPath = resolve(packageRoot, 'src/generated/tokens.css')
const manifestPath = resolve(packageRoot, 'src/generated/tokens.json')
const outputCssPath = resolve(packageRoot, 'dist/default.css')
const outputTokensPath = resolve(packageRoot, 'dist/tokens.css')
const outputManifestPath = resolve(packageRoot, 'dist/tokens.json')

const localImport = /@import\s+['"](\.\/[^'"]+)['"]\s*;\s*/g

async function inlineLocalImports(css, fromDir) {
  let result = ''
  let lastIndex = 0
  for (const match of css.matchAll(localImport)) {
    result += css.slice(lastIndex, match.index)
    const importedPath = resolve(fromDir, match[1])
    const imported = await readFile(importedPath, 'utf8')
    result += await inlineLocalImports(imported, dirname(importedPath))
    lastIndex = (match.index ?? 0) + match[0].length
  }
  return `${result}${css.slice(lastIndex)}`
}

const sourceCss = await readFile(sourcePath, 'utf8')
if (!sourceCss.includes('./generated/tokens.css')) {
  throw new Error(
    'src/default.css must @import ./generated/tokens.css so source and playground builds load tokens',
  )
}

const concatenated = await inlineLocalImports(sourceCss, dirname(sourcePath))

await mkdir(dirname(outputCssPath), { recursive: true })
// Concatenate so the published default.css is one file; source keeps @import.
await writeFile(outputCssPath, concatenated)
await copyFile(tokensPath, outputTokensPath)
await copyFile(manifestPath, outputManifestPath)
