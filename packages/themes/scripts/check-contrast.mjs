import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compileThemeTokens } from './lib/compile-tokens.js'
import { evaluateContrast, formatContrastReport } from './lib/contrast.js'

const tokensDir = resolve(dirname(fileURLToPath(import.meta.url)), '../tokens')
const { tokens } = await compileThemeTokens(tokensDir)
const results = evaluateContrast(tokens)
const failures = results.filter((result) => !result.passesWcagAa)

console.log(formatContrastReport(results))

if (failures.length > 0) {
  console.error(
    `\n${String(failures.length)} pair(s) below WCAG 2 AA. APCA Lc is advisory and does not fail the build.`,
  )
  process.exitCode = 1
} else {
  console.log(
    '\nAll required pairs meet WCAG 2 AA. APCA Lc is advisory and does not fail the build.',
  )
}
