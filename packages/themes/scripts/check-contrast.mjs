import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compileThemeTokens } from './lib/compile-tokens.js'
import { evaluateContrast, formatContrastReport } from './lib/contrast.js'
import { defineTheme, FLAGSHIP_THEME_INPUTS } from './lib/define-theme.js'

const tokensDir = resolve(dirname(fileURLToPath(import.meta.url)), '../tokens')
const catalogs = [
  { name: 'default', tokens: (await compileThemeTokens(tokensDir)).tokens },
  ...FLAGSHIP_THEME_INPUTS.map((input) => ({
    name: input.name,
    tokens: defineTheme(input).tokens,
  })),
]

let failed = false
for (const catalog of catalogs) {
  const results = evaluateContrast(catalog.tokens)
  const failures = results.filter((result) => !result.passesWcagAa)
  console.log(`\n# ${catalog.name}`)
  console.log(formatContrastReport(results))
  if (failures.length > 0) {
    failed = true
    console.error(
      `\n${catalog.name}: ${String(failures.length)} pair(s) below WCAG 2 AA.`,
    )
  }
}

if (failed) {
  console.error(
    '\nWCAG 2 AA failed. APCA Lc is advisory and does not fail the build.',
  )
  process.exitCode = 1
} else {
  console.log(
    '\nAll required pairs on default, calm, vibrant, and mono meet WCAG 2 AA. APCA Lc is advisory and does not fail the build.',
  )
}
