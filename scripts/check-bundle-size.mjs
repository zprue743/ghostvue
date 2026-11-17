#!/usr/bin/env node
/**
 * Bundle size and tree-shaking budgets for built packages (GHO-56).
 *
 * Run after `pnpm build`. Bundles one fixture per package entry and one named
 * import per component against `dist`, fails when a gzip budget is exceeded, a
 * fixture has no budget, a budget has no fixture, or any fixture bundles Vue or
 * leaves a non-Vue import external.
 *
 *   pnpm size          check budgets
 *   pnpm size:write    re-baseline budgets (measured gzip + 10%, next 100 B)
 *
 * Set BUNDLE_SIZE_REPORT=<file> (or pass --report <file>) to also write the
 * Markdown report used for the CI step summary and PR comment.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  bundleFixture,
  collectFixtures,
  evaluateBudgets,
  findExternalViolations,
  formatBytes,
  proposeBudgets,
  renderMarkdownReport,
} from './lib/bundle-size.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const budgetsPath = resolve(repositoryRoot, 'scripts/bundle-size-budgets.json')

const args = process.argv.slice(2)
const write = args.includes('--write')
const reportFlag = args.indexOf('--report')
const reportPath =
  reportFlag >= 0 ? args[reportFlag + 1] : process.env.BUNDLE_SIZE_REPORT

const { aliases, fixtures } = await collectFixtures(repositoryRoot)

const missingBuilds = Object.entries(aliases).filter(
  ([, file]) => !existsSync(file),
)
if (missingBuilds.length > 0) {
  console.error(
    `Missing build output for ${missingBuilds.map(([specifier]) => specifier).join(', ')}. Run \`pnpm build\` first.`,
  )
  process.exit(1)
}

const results = []
for (const fixture of fixtures) {
  let measurement
  try {
    measurement = await bundleFixture({ source: fixture.source, aliases })
  } catch (error) {
    // A missing named export or unresolved entry is a broken public import,
    // which is reported like any other invalid fixture instead of crashing.
    const message = error instanceof Error ? error.message : String(error)
    results.push({
      id: fixture.id,
      group: fixture.group,
      minifiedBytes: 0,
      gzipBytes: 0,
      problems: [`bundle failed: ${message.split('\n')[0]}`],
    })
    continue
  }
  results.push({
    id: fixture.id,
    group: fixture.group,
    minifiedBytes: measurement.minifiedBytes,
    gzipBytes: measurement.gzipBytes,
    problems: findExternalViolations(measurement),
  })
}

if (write) {
  const invalid = results.filter((result) => result.problems.length > 0)
  if (invalid.length > 0) {
    for (const result of invalid) {
      console.error(`${result.id}: ${result.problems.join('; ')}`)
    }
    console.error('Refusing to write budgets for invalid fixtures.')
    process.exit(1)
  }
  await writeFile(
    budgetsPath,
    `${JSON.stringify(proposeBudgets(results), null, 2)}\n`,
  )
  console.log(
    `Wrote ${results.length} budgets to scripts/bundle-size-budgets.json.`,
  )
}

const budgets = JSON.parse(await readFile(budgetsPath, 'utf8'))
const evaluation = evaluateBudgets(results, budgets)

for (const row of evaluation.rows) {
  const budget = row.budget === undefined ? 'none' : formatBytes(row.budget)
  const detail = row.problems.length > 0 ? ` (${row.problems.join('; ')})` : ''
  const line = `${row.status.padEnd(7)} ${row.id}  ${formatBytes(row.gzipBytes)} gzip / ${budget}${detail}`
  if (row.status === 'ok') console.log(line)
  else console.error(line)
}
for (const id of evaluation.stale) {
  console.error(`stale   ${id}  budget has no fixture`)
}

if (reportPath) {
  const target = resolve(process.cwd(), reportPath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, renderMarkdownReport(evaluation))
}

if (evaluation.failed) {
  console.error(
    '\nBundle size check failed. Fix the regression, or run `pnpm size:write` and justify the budget change in review.',
  )
  process.exit(1)
}
console.log(
  `\nAll ${evaluation.rows.length} bundle fixtures are within budget.`,
)
