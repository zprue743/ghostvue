import { appendFileSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'

function markdownText(value) {
  return value.replace(/\s+/g, ' ').replace(/[\\`*_~[\]<>]/g, '\\$&')
}

const reportPath = process.argv[2]
if (!reportPath) {
  throw new Error(
    'Usage: node scripts/summarize-playwright-retries.mjs <results.json>',
  )
}

/** @type {import('@playwright/test/reporter').JSONReport} */
const report = JSON.parse(readFileSync(reportPath, 'utf8'))
if (!Array.isArray(report.suites)) {
  throw new Error('Expected a Playwright JSON report with suites.')
}

const rows = []

/**
 * @param {import('@playwright/test/reporter').JSONReportSuite} suite
 * @param {string[]} groups
 */
function visit(suite, groups) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      const last = test.results.at(-1)
      // Playwright also calls intermittent failures of test.fail() flaky.
      if (
        test.expectedStatus !== 'passed' ||
        test.status !== 'flaky' ||
        last?.status !== 'passed' ||
        last.retry < 1
      )
        continue

      const title = markdownText([...groups, spec.title].join(' › '))
      const location = markdownText(posix.join('tests/e2e', spec.file))
      const project = markdownText(test.projectName)
      rows.push(
        `- **${project}** · ${location}:${spec.line} · ${title} (retry ${last.retry})`,
      )
    }
  }
  for (const child of suite.suites ?? []) visit(child, [...groups, child.title])
}

for (const suite of report.suites) visit(suite, [])

const lines = ['## Playwright tests that passed on retry', '']
if (rows.length === 0) {
  lines.push('No tests passed on retry.')
} else {
  const label = rows.length === 1 ? 'test run' : 'test runs'
  lines.push(`**${rows.length} ${label} passed on retry.**`, '', ...rows)
  const { GITHUB_OUTPUT, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } =
    process.env
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, 'has_flakes=true\n')
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    const artifacts = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}#artifacts`
    lines.push(
      '',
      `Open the retry in the [Playwright HTML report](${artifacts}) to view its trace when available.`,
    )
  }
}

process.stdout.write(lines.join('\n') + '\n')
