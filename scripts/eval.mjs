#!/usr/bin/env node
/**
 * Manual agent eval harness (`pnpm eval`) for GhostVue (GHO-23 / issue #306).
 *
 * Compares `docs-only` against `docs+mcp` across five fixed GhostVue UI tasks,
 * enforces a fail-closed total run budget ($5 default across both conditions
 * and selected tasks), and stores per-run results under `reports/eval/<run-id>/`.
 */
import { relative } from 'node:path'

import { EvalBudgetError } from './lib/eval/budget.js'
import { parseEvalCliArgs, runEval } from './lib/eval/runner.js'

function printHelp() {
  console.log(`Usage: pnpm eval [options]

Options:
  --provider <mock|anthropic|openai|gemini>  Provider (default: mock)
  --model <id>                               Model identifier (required for paid providers)
  --budget <usd>                             Total run budget in USD across all conditions/tasks (default: 5)
  --allow-paid                               Explicitly authorize live paid API calls (blocked in CI)
  --tasks <id1,id2,...>                      Comma-separated subset of the 5 tasks
  --conditions <docs-only,docs+mcp>          Comparison conditions (default: docs-only,docs+mcp)
  --mock-profile <comparison|reference>      Offline mock behavior (default: comparison)
  --max-turns <n>                            Max turns per trial (default: 6)
  --max-input-tokens <n>                     Max input tokens bound per turn (default: 24000)
  --max-output-tokens <n>                    Max output tokens bound per turn (default: 4096)
  --temperature <n>                          Sampling temperature (default: 0)
  --out-dir <dir>                            Output directory (default: reports/eval)
  --run-id <id>                              Custom run folder id
  --skip-browser                             Skip Playwright behavior/keyboard/axe/visual checks
  --skip-typecheck                           Skip vue-tsc typecheck
  --help                                     Show this help
`)
}

try {
  const options = parseEvalCliArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    process.exit(0)
  }

  const { report, runDir, resultsPath, summaryPath } = await runEval(options)
  console.log(`Eval run ${report.runId} completed.`)
  console.log(`Results: ${relative(process.cwd(), resultsPath)}`)
  console.log(`Summary: ${relative(process.cwd(), summaryPath)}`)
  console.log(`Artifacts dir: ${relative(process.cwd(), runDir)}`)
  for (const row of report.comparisonSummary) {
    console.log(
      `  [${row.condition}] typecheck=${row.typecheckPassed}/${row.trialCount} eslint=${row.eslintPassed}/${row.trialCount} behavior=${row.behaviorCounts.passed}/${row.behaviorCounts.passed + row.behaviorCounts.failed + row.behaviorCounts.skipped + row.behaviorCounts.missing} keyboard=${row.keyboardCounts.passed}/${row.keyboardCounts.passed + row.keyboardCounts.failed + row.keyboardCounts.skipped + row.keyboardCounts.missing} axe-states=${row.axeCounts.passed}/${row.axeCounts.passed + row.axeCounts.failed + row.axeCounts.skipped + row.axeCounts.missing} visual-captured=${row.visualCaptured} spend=$${row.usage.costUsd.toFixed(6)}`,
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(error instanceof EvalBudgetError ? 2 : 1)
}
