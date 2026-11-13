import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const packages = ['core', 'shared', 'themes', 'vue']
const metrics = ['lines', 'statements', 'functions', 'branches']

/** Aggregate file counts, rather than averaging percentages of unequal files. */
export function formatCoverageSummary(summary) {
  const rows = [['Total', summary.total]]

  for (const name of packages) {
    const directory = `packages/${name}/src`
    const aggregate = Object.fromEntries(
      metrics.map((metric) => [metric, { covered: 0, total: 0 }]),
    )

    for (const [file, coverage] of Object.entries(summary)) {
      const normalized = `/${file.replaceAll('\\', '/')}`
      if (!normalized.includes(`/${directory}/`)) continue

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
    'Line coverage gate: 80% for the total and each package source directory.',
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
          metric === 'lines' ? ` ${percent >= 80 ? 'PASS' : 'FAIL'}` : ''
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
  const summary = JSON.parse(
    await readFile('coverage/coverage-summary.json', 'utf8'),
  )
  process.stdout.write(formatCoverageSummary(summary))
}
