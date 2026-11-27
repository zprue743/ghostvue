import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(packageRoot, 'src')
const sourcePath = resolve(sourceDir, 'default.css')
const basePath = resolve(sourceDir, 'base.css')
const tokensPath = resolve(packageRoot, 'src/generated/tokens.css')
const manifestPath = resolve(packageRoot, 'src/generated/tokens.json')
const defineTypesPath = resolve(
  packageRoot,
  'scripts/lib/define-theme-public.d.ts',
)
const outputCssPath = resolve(packageRoot, 'dist/default.css')
const outputBasePath = resolve(packageRoot, 'dist/base.css')
const outputRecipesDir = resolve(packageRoot, 'dist/recipes')
const outputTokensPath = resolve(packageRoot, 'dist/tokens.css')
const outputManifestPath = resolve(packageRoot, 'dist/tokens.json')
const outputDefineTypesPath = resolve(packageRoot, 'dist/define.d.ts')
const flagshipNames = ['calm', 'vibrant', 'mono']

const localImport = /@import\s+['"](\.[^'"]+)['"]\s*;\s*/g

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

// Opt-in path (#386): the shared base and one file per component recipe, so
// an app can pair a single palette with only the recipes it renders. The
// recipe files are the same sources `default.css` concatenates, published
// as `@ghostvue/themes/recipes/<slug>.css` (`ghost-` prefix dropped).
await writeFile(
  outputBasePath,
  await inlineLocalImports(await readFile(basePath, 'utf8'), sourceDir),
)
await mkdir(outputRecipesDir, { recursive: true })
for (const file of await readdir(sourceDir)) {
  const match = /^ghost-([\w-]+\.css)$/.exec(file)
  if (!match) continue
  const recipePath = resolve(sourceDir, file)
  await writeFile(
    resolve(outputRecipesDir, match[1]),
    await inlineLocalImports(await readFile(recipePath, 'utf8'), sourceDir),
  )
}
await copyFile(tokensPath, outputTokensPath)
await copyFile(manifestPath, outputManifestPath)

for (const name of flagshipNames) {
  await copyFile(
    resolve(packageRoot, `src/generated/${name}.css`),
    resolve(packageRoot, `dist/${name}.css`),
  )
}

await copyFile(defineTypesPath, outputDefineTypesPath)
