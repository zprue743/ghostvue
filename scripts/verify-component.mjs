import { fileURLToPath } from 'node:url'

import { verifyComponent } from './lib/verify-component.js'

const args = process.argv.slice(2)
const reportIndex = args.indexOf('--report')
const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : undefined
const names = reportIndex >= 0 ? args.slice(0, reportIndex) : args
if (
  names.length !== 1 ||
  (reportIndex >= 0 && (!reportPath || args.length !== reportIndex + 2))
) {
  console.error('Usage: pnpm verify:component <Name> [--report <path>]')
  process.exitCode = 1
} else {
  const result = await verifyComponent({
    repositoryRoot: fileURLToPath(new URL('..', import.meta.url)),
    name: names[0],
    reportPath,
  })
  for (const check of result.report.checks) {
    console.log(
      `${check.status.toUpperCase()} ${check.name} (${check.durationMs}ms)${check.errors.length ? `: ${check.errors[0]}` : ''}`,
    )
  }
  console.log(
    `${result.report.component}: ${result.report.status.toUpperCase()} (${result.report.durationMs}ms). Report: ${result.reportPath}`,
  )
  process.exitCode = result.report.status === 'pass' ? 0 : 1
}
