import { readFile } from 'node:fs/promises'
import { posix, win32 } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  coverageSourceDirectories,
  lineCoverageThreshold,
} from './coverage-policy.mjs'

const metrics = ['lines', 'statements', 'functions', 'branches']

/** Aggregate file counts, rather than averaging percentages of unequal files. */
export function formatCoverageSummary(summary, projectRoot) {
  const rows = [['Total', summary.total]]
  const paths =
    win32.isAbsolute(projectRoot) && !posix.isAbsolute(projectRoot)
      ? win32
      : posix
  const files = Object.entries(summary).map(([file, coverage]) => [
    paths
      .relative(
        projectRoot,
        paths.resolve(projectRoot, file.replaceAll('\\', '/')),
      )
      .replaceAll('\\', '/'),
    coverage,
  ])

  for (const directory of coverageSourceDirectories) {
    const aggregate = Object.fromEntries(
      metrics.map((metric) => [metric, { covered: 0, total: 0 }]),
    )

    for (const [file, coverage] of files) {
      if (!file.startsWith(`${directory}/`)) continue

      for (const metric of metrics) {
        aggregate[metric].covered += coverage[metric].covered
        aggregate[metric].total += coverage[metric].total
      }
    }
    rows.push([directory, aggregate])
  }

  return [
    '## Coverage',
    '',
    `Line coverage gate: ${lineCoverageThreshold}% for the total and each package source directory.`,
    '',
    '| Scope | Lines | Statements | Functions | Branches |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(([label, coverage]) => {
      const cells = metrics.map((metric) => {
        const { covered, total } = coverage[metric]
        // Match Istanbul: empty metrics are 100%; truncate to two decimals.
        const percent =
          total === 0 ? 100 : Math.floor((covered * 10000) / total) / 100
        const mark =
          metric === 'lines'
            ? ` ${percent >= lineCoverageThreshold ? 'PASS' : 'FAIL'}`
            : ''
        return `${percent.toFixed(2)}%${mark}`
      })
      return `| ${label} | ${cells.join(' | ')} |`
    }),
    '',
  ].join('\n')
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const summary = JSON.parse(
      await readFile('coverage/coverage-summary.json', 'utf8'),
    )
    process.stdout.write(formatCoverageSummary(summary, process.cwd()))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    console.error('Coverage report not found. Run pnpm test:coverage first.')
    process.exitCode = 1
  }
}
