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

const tokenImport = /@import\s+['"]\.\/generated\/tokens\.css['"]\s*;\s*/

const sourceCss = await readFile(sourcePath, 'utf8')
if (!tokenImport.test(sourceCss)) {
  throw new Error(
    'src/default.css must @import ./generated/tokens.css so source and playground builds load tokens',
  )
}

const tokensCss = await readFile(tokensPath, 'utf8')
const componentCss = sourceCss.replace(tokenImport, '')

await mkdir(dirname(outputCssPath), { recursive: true })
// Concatenate so the published default.css is one file; source keeps @import.
await writeFile(outputCssPath, `${tokensCss.trimEnd()}\n${componentCss}`)
await copyFile(tokensPath, outputTokensPath)
await copyFile(manifestPath, outputManifestPath)
