import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { writeThemeTokenOutputs } from './lib/compile-tokens.js'
import { defineTheme, FLAGSHIP_THEME_INPUTS } from './lib/define-theme.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsPath = resolve(packageRoot, '../../docs/themes/tokens.md')

const { paths } = await writeThemeTokenOutputs({ packageRoot, docsPath })
if (paths.ramps) console.log(`Wrote ${paths.ramps}`)
console.log(`Wrote ${paths.css}`)
console.log(`Wrote ${paths.typescript}`)
console.log(`Wrote ${paths.manifest}`)
console.log(`Wrote ${paths.docs}`)

const generatedDir = join(packageRoot, 'src/generated')
await mkdir(generatedDir, { recursive: true })
for (const input of FLAGSHIP_THEME_INPUTS) {
  const theme = defineTheme(input)
  const cssPath = join(generatedDir, `${theme.name}.css`)
  await writeFile(cssPath, theme.css)
  console.log(`Wrote ${cssPath}`)
}
