import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BudgetLedger,
  DEFAULT_MAX_BUDGET_USD,
  DEFAULT_RUN_SETTINGS,
  evaluateBudgetPreflight,
} from './budget.js'
import { gradeTrialOutput } from './grader.js'
import {
  createDocsOnlyToolEnvironment,
  createMcpToolEnvironment,
} from './mcp-client.js'
import { runAgentTrial } from './providers.js'
import { resolveEvalTasks, EVAL_TASK_SET_VERSION } from './tasks.js'

const DEFAULT_CONDITIONS = /** @type {const} */ (['docs-only', 'docs+mcp'])

/**
 * @param {string} repositoryRoot
 * @param {string} relPath
 * @returns {Promise<string>}
 */
async function readPackageVersion(repositoryRoot, relPath) {
  try {
    const raw = JSON.parse(
      await readFile(join(repositoryRoot, relPath), 'utf8'),
    )
    return typeof raw.version === 'string' ? raw.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * @param {string} repositoryRoot
 * @returns {{ gitSha: string, gitDirty: boolean }}
 */
function readGitRevision(repositoryRoot) {
  try {
    const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return { gitSha, gitDirty: status.length > 0 }
  } catch {
    return { gitSha: 'unknown', gitDirty: false }
  }
}

/**
 * @param {string} repositoryRoot
 * @param {import('./types.d.ts').McpStampMetadata | null} mcpStamp
 * @param {number} docsCorpusPageCount
 * @returns {Promise<import('./types.d.ts').EvalEnvironmentMetadata>}
 */
async function collectEnvironmentMetadata(
  repositoryRoot,
  mcpStamp,
  docsCorpusPageCount,
) {
  const { gitSha, gitDirty } = readGitRevision(repositoryRoot)
  const rootPkg = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  )
  const devDeps = /** @type {Record<string, string>} */ (
    rootPkg.devDependencies ?? {}
  )
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitSha,
    gitDirty,
    packageVersions: {
      '@ghostvue/vue': await readPackageVersion(
        repositoryRoot,
        'packages/vue/package.json',
      ),
      '@ghostvue/themes': await readPackageVersion(
        repositoryRoot,
        'packages/themes/package.json',
      ),
      '@ghostvue/core': await readPackageVersion(
        repositoryRoot,
        'packages/core/package.json',
      ),
      '@ghostvue/mcp': await readPackageVersion(
        repositoryRoot,
        'packages/mcp/package.json',
      ),
      '@ghostvue/eslint-plugin': await readPackageVersion(
        repositoryRoot,
        'packages/eslint-plugin/package.json',
      ),
      vue: devDeps.vue ?? 'unknown',
      typescript: devDeps.typescript ?? 'unknown',
      '@playwright/test': devDeps['@playwright/test'] ?? 'unknown',
      '@axe-core/playwright': devDeps['@axe-core/playwright'] ?? 'unknown',
    },
    mcp: mcpStamp,
    docsCorpusPageCount,
  }
}

/**
 * @param {import('./types.d.ts').DimensionCounts[]} list
 * @returns {import('./types.d.ts').DimensionCounts}
 */
function sumDimensionCounts(list) {
  return list.reduce(
    (acc, item) => ({
      passed: acc.passed + item.passed,
      failed: acc.failed + item.failed,
      skipped: acc.skipped + item.skipped,
      missing: acc.missing + item.missing,
    }),
    { passed: 0, failed: 0, skipped: 0, missing: 0 },
  )
}

/**
 * @param {readonly import('./types.d.ts').EvalCondition[]} conditions
 * @param {readonly import('./types.d.ts').TrialResult[]} trials
 * @returns {import('./types.d.ts').ConditionSummary[]}
 */
function buildComparisonSummary(conditions, trials) {
  return conditions.map((condition) => {
    const group = trials.filter((trial) => trial.condition === condition)
    const inputTokens = group.reduce((s, t) => s + t.usage.inputTokens, 0)
    const outputTokens = group.reduce((s, t) => s + t.usage.outputTokens, 0)
    const costUsd = Number(
      group.reduce((s, t) => s + t.usage.costUsd, 0).toFixed(8),
    )
    return {
      condition,
      trialCount: group.length,
      typecheckPassed: group.filter(
        (t) => t.grading.typecheck.status === 'passed',
      ).length,
      eslintPassed: group.filter((t) => t.grading.eslint.status === 'passed')
        .length,
      constraintsPassed: group.filter(
        (t) => t.grading.constraints.status === 'passed',
      ).length,
      buildPassed: group.filter((t) => t.grading.build.status === 'passed')
        .length,
      behaviorCounts: sumDimensionCounts(
        group.map((t) => t.grading.behavior.counts),
      ),
      keyboardCounts: sumDimensionCounts(
        group.map((t) => t.grading.keyboard.counts),
      ),
      axeCounts: sumDimensionCounts(group.map((t) => t.grading.axe.counts)),
      visualCaptured: group.reduce(
        (s, t) => s + t.grading.visual.capturedCount,
        0,
      ),
      visualSkipped: group.reduce(
        (s, t) => s + t.grading.visual.skippedCount,
        0,
      ),
      visualFailed: group.reduce((s, t) => s + t.grading.visual.failedCount, 0),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd,
      },
    }
  })
}

/**
 * @param {import('./types.d.ts').DimensionCounts} c
 * @returns {string}
 */
function formatCounts(c) {
  return `${String(c.passed)} passed, ${String(c.failed)} failed, ${String(c.skipped)} skipped, ${String(c.missing)} missing`
}

/**
 * Renders a human-readable Markdown summary keeping every grading dimension
 * separate and explicitly noting that captured screenshots are unreviewed.
 *
 * @param {import('./types.d.ts').EvalRunReport} report
 * @returns {string}
 */
export function renderEvalSummaryMarkdown(report) {
  const lines = [
    `# GhostVue Agent Eval Run: \`${report.runId}\``,
    '',
    `- **Timestamp:** ${report.timestamp}`,
    `- **Task set version:** \`${report.taskSetVersion}\``,
    `- **Provider / model:** \`${report.provider}\` / \`${report.model}\``,
    `- **Total run budget:** $${report.budget.budgetUsd.toFixed(2)} (worst-case preflight: $${report.preflight.worstCaseTotalUsd.toFixed(4)})`,
    `- **Actual spend:** $${report.budget.spentUsd.toFixed(6)} (${String(report.budget.totalTokens)} tokens across ${String(report.budget.calls)} call(s))`,
    `- **Git revision:** \`${report.environment.gitSha}\`${report.environment.gitDirty ? ' (dirty)' : ''}`,
    `- **MCP asset bundle:** ${report.environment.mcp ? `\`${report.environment.mcp.assetBundleId}\` (v${report.environment.mcp.version})` : 'not connected'}`,
    '',
    '## Comparison summary (separate dimensions)',
    '',
    '| Condition | Trials | Typecheck | ESLint | Constraints | Build | Behavior | Keyboard | Axe (per-state) | Visual evidence | Spend |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: |',
  ]

  for (const row of report.comparisonSummary) {
    lines.push(
      `| \`${row.condition}\` | ${String(row.trialCount)} | ${String(row.typecheckPassed)}/${String(row.trialCount)} | ${String(row.eslintPassed)}/${String(row.trialCount)} | ${String(row.constraintsPassed)}/${String(row.trialCount)} | ${String(row.buildPassed)}/${String(row.trialCount)} | ${formatCounts(row.behaviorCounts)} | ${formatCounts(row.keyboardCounts)} | ${formatCounts(row.axeCounts)} | ${String(row.visualCaptured)} captured (unreviewed), ${String(row.visualSkipped)} skipped, ${String(row.visualFailed)} failed | $${row.usage.costUsd.toFixed(6)} |`,
    )
  }

  lines.push(
    '',
    '> **Visual review policy:** Captured screenshots are review evidence only. An unreviewed artifact has **not** passed human visual assessment.',
    '',
    '## Per-trial breakdown',
    '',
  )

  for (const trial of report.trials) {
    lines.push(
      `### \`${trial.taskId}\` — \`${trial.condition}\` (${trial.status})`,
      '',
      `- **Tools called:** ${trial.toolTrace.length > 0 ? trial.toolTrace.map((t) => `\`${t.tool}\``).join(', ') : 'none'}`,
      `- **Typecheck:** \`${trial.grading.typecheck.status}\` (${String(trial.grading.typecheck.errorCount)} error(s))`,
      `- **ESLint:** \`${trial.grading.eslint.status}\` (${String(trial.grading.eslint.errorCount)} error(s))`,
      `- **Constraints:** \`${trial.grading.constraints.status}\``,
      `- **Vite build:** \`${trial.grading.build.status}\``,
      `- **Behavior:** ${formatCounts(trial.grading.behavior.counts)}`,
      `- **Keyboard:** ${formatCounts(trial.grading.keyboard.counts)}`,
      `- **Axe:** ${formatCounts(trial.grading.axe.counts)}`,
    )
    if (trial.error) {
      lines.push(`- **Trial error:** ${trial.error}`)
    }
    if (trial.grading.visual.artifacts.length > 0) {
      lines.push(
        `- **Visual evidence:** ${trial.grading.visual.artifacts.map((a) => `\`${a.state}\` (${a.status}${a.artifactPath ? `: ${a.artifactPath}` : ''})`).join('; ')}`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Executes a full manual eval run across selected tasks and comparison
 * conditions (`docs-only` vs `docs+mcp`), enforcing fail-closed budget
 * preflight before any LLM call and persisting pinned results per run.
 *
 * @param {import('./runner.d.ts').RunEvalOptions} [options]
 */
export async function runEval(options = {}) {
  const repositoryRoot = resolve(
    options.repositoryRoot ??
      fileURLToPath(new URL('../../..', import.meta.url)),
  )
  const provider = options.provider ?? 'mock'
  const model =
    options.model ?? (provider === 'mock' ? 'mock-deterministic-v1' : '')
  if (!model) {
    throw new Error(
      `--model is required when using provider "${provider}" (fail-closed).`,
    )
  }

  const budgetUsd =
    options.budgetUsd === undefined ? DEFAULT_MAX_BUDGET_USD : options.budgetUsd
  const tasks = resolveEvalTasks(options.tasks)
  const conditions =
    options.conditions && options.conditions.length > 0
      ? options.conditions
      : DEFAULT_CONDITIONS

  /** @type {import('./types.d.ts').EvalRunSettings} */
  const settings = {
    ...DEFAULT_RUN_SETTINGS,
    ...options.settings,
  }

  const preflight = evaluateBudgetPreflight({
    budgetUsd,
    provider,
    model,
    trialCount: tasks.length * conditions.length,
    settings,
    allowPaid: options.allowPaid === true,
    ...(options.customPricing ? { customPricing: options.customPricing } : {}),
    ...(options.env ? { env: options.env } : {}),
  })

  const ledger = new BudgetLedger({
    budgetUsd: preflight.budgetUsd,
    provider,
    pricing: preflight.pricing,
  })

  const timestamp = new Date().toISOString()
  const runId =
    options.runId ??
    `${timestamp.replace(/[:.]/g, '-')}-${provider}-${model.replace(/[^a-zA-Z0-9._-]+/g, '_')}`
  const baseOutDir = resolve(repositoryRoot, options.outDir ?? 'reports/eval')
  const runDir = join(baseOutDir, runId)
  await mkdir(runDir, { recursive: true })

  /** @type {Partial<Record<import('./types.d.ts').EvalCondition, import('./mcp-client.d.ts').EvalToolEnvironment>>} */
  const toolEnvs = {}
  /** @type {import('./types.d.ts').TrialResult[]} */
  const trials = []

  try {
    if (conditions.includes('docs-only')) {
      toolEnvs['docs-only'] =
        await createDocsOnlyToolEnvironment(repositoryRoot)
    }
    if (conditions.includes('docs+mcp')) {
      toolEnvs['docs+mcp'] = await createMcpToolEnvironment({
        repositoryRoot,
        ensureBuilt: options.ensureMcpBuilt ?? true,
      })
    }

    const docsCorpusPageCount =
      toolEnvs['docs-only']?.docsCorpusPageCount ??
      toolEnvs['docs+mcp']?.docsCorpusPageCount ??
      0
    const mcpStamp = toolEnvs['docs+mcp']?.mcpStamp ?? null
    const environment = await collectEnvironmentMetadata(
      repositoryRoot,
      mcpStamp,
      docsCorpusPageCount,
    )

    for (const condition of conditions) {
      const toolEnv = toolEnvs[condition]
      if (!toolEnv) {
        throw new Error(
          `Missing tool environment for condition "${condition}".`,
        )
      }
      const toolsAvailable = toolEnv.tools.map((t) => t.name)

      for (const task of tasks) {
        const outcome = await runAgentTrial({
          provider,
          model,
          condition,
          task,
          settings,
          toolEnv,
          ledger,
          worstCasePerCallUsd: preflight.worstCasePerCallUsd,
          ...(options.mockProfile ? { mockProfile: options.mockProfile } : {}),
          ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
          ...(options.env ? { env: options.env } : {}),
          ...(options.mockSolver ? { mockSolver: options.mockSolver } : {}),
        })

        let generatedFilePath = /** @type {string | null} */ (null)
        if (outcome.sfcSource) {
          const genDir = join(runDir, 'generated', condition, task.id)
          await mkdir(genDir, { recursive: true })
          const absFile = join(genDir, 'TaskOutput.vue')
          await writeFile(absFile, outcome.sfcSource, 'utf8')
          generatedFilePath = `generated/${condition}/${task.id}/TaskOutput.vue`
        }

        const artifactRelBase = `artifacts/${condition}/${task.id}`
        const artifactDir = join(runDir, 'artifacts', condition, task.id)
        const grading = await gradeTrialOutput({
          repositoryRoot,
          task,
          sfcSource: outcome.sfcSource,
          artifactDir,
          artifactRelativeBase: artifactRelBase,
          skipTypecheck: options.skipTypecheck === true,
          skipBrowser: options.skipBrowser === true,
          ...(options.browser ? { browser: options.browser } : {}),
        })

        trials.push({
          taskId: task.id,
          taskVersion: task.version,
          taskPromptHash: task.promptHash,
          condition,
          status: outcome.status,
          ...(outcome.error ? { error: outcome.error } : {}),
          toolsAvailable,
          toolTrace: outcome.toolTrace,
          usage: outcome.usage,
          generatedFilePath,
          grading,
        })
      }
    }

    /** @type {import('./types.d.ts').EvalRunReport} */
    const report = {
      schemaVersion: '1.0.0',
      runId,
      timestamp,
      taskSetVersion: EVAL_TASK_SET_VERSION,
      provider,
      model,
      ...(provider === 'mock'
        ? { mockProfile: options.mockProfile ?? 'comparison' }
        : {}),
      settings,
      conditions,
      tasks: tasks.map((t) => ({
        id: t.id,
        version: t.version,
        promptHash: t.promptHash,
        prompt: t.prompt,
      })),
      preflight,
      budget: ledger.snapshot(),
      environment,
      trials,
      comparisonSummary: buildComparisonSummary(conditions, trials),
    }

    const resultsPath = join(runDir, 'results.json')
    const summaryPath = join(runDir, 'summary.md')
    await writeFile(resultsPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    await writeFile(summaryPath, renderEvalSummaryMarkdown(report), 'utf8')

    return {
      report,
      runDir,
      resultsPath,
      summaryPath,
    }
  } finally {
    await Promise.all(
      Object.values(toolEnvs)
        .filter(Boolean)
        .map((env) => env.close()),
    )
  }
}

/**
 * Parses `pnpm eval` CLI flags.
 *
 * @param {readonly string[]} argv
 * @returns {import('./runner.d.ts').RunEvalOptions & { help?: boolean }}
 */
export function parseEvalCliArgs(argv) {
  /** @type {Record<string, unknown>} */
  const parsed = {}
  /** @type {Record<string, unknown>} */
  const settings = {}

  /** @param {number} index @param {string} flag */
  const requireValue = (index, flag) => {
    const val = argv[index + 1]
    if (val === undefined || val.startsWith('--')) {
      throw new Error(`Flag ${flag} requires a value.`)
    }
    return val
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
    } else if (arg === '--allow-paid') {
      parsed.allowPaid = true
    } else if (arg === '--skip-browser') {
      parsed.skipBrowser = true
    } else if (arg === '--skip-typecheck') {
      parsed.skipTypecheck = true
    } else if (arg === '--provider') {
      parsed.provider = requireValue(i, arg)
      i += 1
    } else if (arg === '--model') {
      parsed.model = requireValue(i, arg)
      i += 1
    } else if (arg === '--budget') {
      const raw = Number(requireValue(i, arg))
      parsed.budgetUsd = raw
      i += 1
    } else if (arg === '--tasks') {
      parsed.tasks = requireValue(i, arg)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      i += 1
    } else if (arg === '--conditions') {
      parsed.conditions = requireValue(i, arg)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      i += 1
    } else if (arg === '--mock-profile') {
      parsed.mockProfile = requireValue(i, arg)
      i += 1
    } else if (arg === '--out-dir') {
      parsed.outDir = requireValue(i, arg)
      i += 1
    } else if (arg === '--run-id') {
      parsed.runId = requireValue(i, arg)
      i += 1
    } else if (arg === '--max-turns') {
      settings.maxTurnsPerTrial = Number(requireValue(i, arg))
      i += 1
    } else if (arg === '--max-output-tokens') {
      settings.maxOutputTokensPerTurn = Number(requireValue(i, arg))
      i += 1
    } else if (arg === '--max-input-tokens') {
      settings.maxInputTokensPerTurn = Number(requireValue(i, arg))
      i += 1
    } else if (arg === '--temperature') {
      settings.temperature = Number(requireValue(i, arg))
      i += 1
    } else {
      throw new Error(`Unknown eval flag: ${arg}`)
    }
  }

  if (Object.keys(settings).length > 0) {
    parsed.settings = settings
  }
  return /** @type {import('./runner.d.ts').RunEvalOptions & { help?: boolean }} */ (
    parsed
  )
}
