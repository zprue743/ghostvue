/** @vitest-environment node */

import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  BudgetLedger,
  DEFAULT_MAX_BUDGET_USD,
  DEFAULT_RUN_SETTINGS,
  EvalBudgetError,
  evaluateBudgetPreflight,
} from '../../scripts/lib/eval/budget.js'
import {
  buildGeneratedSfc,
  evaluateTaskConstraints,
  gradeTrialOutput,
  lintGeneratedSfc,
  typecheckGeneratedSfc,
} from '../../scripts/lib/eval/grader.js'
import { runAgentTrial } from '../../scripts/lib/eval/providers.js'
import { getReferenceSolutionSfc } from '../../scripts/lib/eval/reference-solutions.js'
import { parseEvalCliArgs, runEval } from '../../scripts/lib/eval/runner.js'
import {
  EVAL_TASKS,
  EVAL_TASK_SET_VERSION,
} from '../../scripts/lib/eval/tasks.js'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const tempDirs: string[] = []

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('eval budget preflight and fail-closed enforcement', () => {
  it('defaults to a $5 total run cap across all tasks and conditions and fails closed when exceeded', () => {
    expect(DEFAULT_MAX_BUDGET_USD).toBe(5)

    // 10 trials (5 tasks x 2 conditions) x 6 turns on claude-sonnet-4 exceeds $5 worst-case.
    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: DEFAULT_MAX_BUDGET_USD,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        trialCount: 10,
        settings: DEFAULT_RUN_SETTINGS,
        allowPaid: true,
        env: {},
      }),
    ).toThrow(EvalBudgetError)

    try {
      evaluateBudgetPreflight({
        budgetUsd: DEFAULT_MAX_BUDGET_USD,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        trialCount: 10,
        settings: DEFAULT_RUN_SETTINGS,
        allowPaid: true,
        env: {},
      })
    } catch (error) {
      expect(error).toBeInstanceOf(EvalBudgetError)
      expect((error as EvalBudgetError).code).toBe('BUDGET_PREFLIGHT_EXCEEDED')
    }

    // Tighter turn/token bounds fit safely within $5 across both conditions.
    const preflight = evaluateBudgetPreflight({
      budgetUsd: DEFAULT_MAX_BUDGET_USD,
      provider: 'openai',
      model: 'gpt-4.1-mini',
      trialCount: 10,
      settings: {
        ...DEFAULT_RUN_SETTINGS,
        maxTurnsPerTrial: 4,
        maxInputTokensPerTurn: 12_000,
        maxOutputTokensPerTurn: 2_048,
      },
      allowPaid: true,
      env: {},
    })
    expect(preflight.ok).toBe(true)
    expect(preflight.worstCaseTotalUsd).toBeLessThanOrEqual(5)
  })

  it('fails closed on unknown model pricing, missing authorization, CI environments, and unbounded limits', () => {
    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: 5,
        provider: 'openai',
        model: 'unpriced-experimental-model',
        trialCount: 2,
        settings: DEFAULT_RUN_SETTINGS,
        allowPaid: true,
        env: {},
      }),
    ).toThrow(/Cannot bound cost/)

    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: 5,
        provider: 'openai',
        model: 'gpt-4.1-mini',
        trialCount: 2,
        settings: DEFAULT_RUN_SETTINGS,
        allowPaid: false,
        env: {},
      }),
    ).toThrow(/requires explicit manual authorization/)

    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: 5,
        provider: 'openai',
        model: 'gpt-4.1-mini',
        trialCount: 2,
        settings: DEFAULT_RUN_SETTINGS,
        allowPaid: true,
        env: { CI: 'true' },
      }),
    ).toThrow(/blocked in CI/)

    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: 5,
        provider: 'openai',
        model: 'gpt-4.1-mini',
        trialCount: 2,
        settings: { ...DEFAULT_RUN_SETTINGS, maxRetries: 1 },
        allowPaid: true,
        env: {},
      }),
    ).toThrow(/Automatic retries/)

    expect(() =>
      evaluateBudgetPreflight({
        budgetUsd: 0,
        provider: 'mock',
        model: 'mock-deterministic-v1',
        trialCount: 2,
        settings: DEFAULT_RUN_SETTINGS,
        env: {},
      }),
    ).toThrow(/Eval budget must be a finite USD amount/)
  })

  it('aborts mid-trial via BudgetLedger without making overspend API calls (stubbed fetch)', async () => {
    const preflight = evaluateBudgetPreflight({
      budgetUsd: 0.05,
      provider: 'openai',
      model: 'gpt-4.1-mini',
      trialCount: 1,
      settings: {
        temperature: 0,
        maxTurnsPerTrial: 3,
        maxInputTokensPerTurn: 10_000,
        maxOutputTokensPerTurn: 2_000,
        maxRetries: 0,
      },
      allowPaid: true,
      env: {},
    })

    const ledger = new BudgetLedger({
      budgetUsd: 0.01, // Tighter runtime cap than single worst-case call ($0.0072) after 1st turn spends $0.004
      provider: 'openai',
      pricing: preflight.pricing,
    })

    let fetchCalls = 0
    const stubFetch: typeof fetch = () => {
      fetchCalls += 1
      return Promise.resolve(
        new Response(
          JSON.stringify({
            usage: { prompt_tokens: 10_000, completion_tokens: 2_000 },
            choices: [
              {
                message: {
                  role: 'assistant',
                  tool_calls: [
                    {
                      id: 'call_1',
                      function: {
                        name: 'docs_search',
                        arguments: '{"query":"button"}',
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    }

    const fakeToolEnv = {
      tools: [
        {
          name: 'docs_search',
          description: 'Search docs',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        },
      ],
      mcpStamp: null,
      docsCorpusPageCount: 1,
      callTool: () => Promise.resolve({ ok: true, content: '{"hits":[]}' }),
      close: () => Promise.resolve(),
    }

    const task = EVAL_TASKS[0]
    if (!task) throw new Error('Expected EVAL_TASKS[0]')

    const outcome = await runAgentTrial({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      condition: 'docs-only',
      task,
      settings: {
        temperature: 0,
        maxTurnsPerTrial: 3,
        maxInputTokensPerTurn: 10_000,
        maxOutputTokensPerTurn: 2_000,
        maxRetries: 0,
      },
      toolEnv: fakeToolEnv,
      ledger,
      worstCasePerCallUsd: preflight.worstCasePerCallUsd,
      fetchImpl: stubFetch,
      env: { OPENAI_API_KEY: 'test-stub-key' },
    })

    // Turn 1 runs ($0.0072 spent), Turn 2 sees $0.0072 + $0.0072 > $0.01 and aborts BEFORE fetch!
    expect(fetchCalls).toBe(1)
    expect(outcome.status).toBe('aborted-budget')
    expect(outcome.error).toContain('BUDGET_EXHAUSTED')
    expect(ledger.snapshot().exhausted).toBe(true)
  })
})

describe('eval task definitions and static/typecheck/build grading', () => {
  it('pins all five shipped-primitive tasks and forbids GhostDataTable on paginated-table', () => {
    expect(EVAL_TASK_SET_VERSION).toBe('1.0.0')
    expect(EVAL_TASKS.map((t) => t.id)).toEqual([
      'login-form',
      'settings-dialog',
      'async-combobox-search',
      'paginated-table',
      'validation-error-form',
    ])

    const paginatedTask = EVAL_TASKS.find((t) => t.id === 'paginated-table')
    if (!paginatedTask) {
      throw new Error('Expected paginated-table task')
    }
    expect(paginatedTask.forbiddenIdentifiers).toContain('GhostDataTable')

    const cheatingSfc = `<script setup lang="ts">
import { GhostDataTable } from '@ghostvue/vue'
</script>
<template><GhostDataTable :rows="[]" /></template>`
    const constraints = evaluateTaskConstraints(paginatedTask, cheatingSfc)
    expect(constraints.status).toBe('failed')
    expect(
      constraints.checks.find((c) => c.id === 'forbid-GhostDataTable')?.status,
    ).toBe('failed')
  })

  it('passes ESLint, vue-tsc typecheck, and Vite build on all five reference SFCs', async () => {
    for (const task of EVAL_TASKS) {
      const sfc = getReferenceSolutionSfc(task.id)
      const constraints = evaluateTaskConstraints(task, sfc)
      expect(constraints.status, `${task.id} constraints`).toBe('passed')

      const eslint = await lintGeneratedSfc(repositoryRoot, sfc)
      expect(eslint.messages, `${task.id} eslint`).toEqual([])
      expect(eslint.status, `${task.id} eslint`).toBe('passed')

      const typecheck = await typecheckGeneratedSfc(repositoryRoot, sfc)
      expect(typecheck.diagnostics, `${task.id} typecheck`).toEqual([])
      expect(typecheck.status, `${task.id} typecheck`).toBe('passed')

      const outDir = await makeTempDir(`ghostvue-eval-build-${task.id}-`)
      const build = await buildGeneratedSfc(repositoryRoot, sfc, outDir)
      expect(build.detail, `${task.id} build`).toBeUndefined()
      expect(build.status, `${task.id} build`).toBe('passed')
    }
  }, 300_000)

  it('reports skipped/missing browser checks explicitly when SFC is missing or browser grading is skipped', async () => {
    const task = EVAL_TASKS[0]
    if (!task) {
      throw new Error('Expected EVAL_TASKS[0]')
    }
    const artifactDir = await makeTempDir('ghostvue-eval-empty-artifacts-')

    const missingResult = await gradeTrialOutput({
      repositoryRoot,
      task,
      sfcSource: null,
      artifactDir,
      artifactRelativeBase: 'artifacts/docs-only/login-form',
    })
    expect(missingResult.constraints.status).toBe('missing')
    expect(missingResult.typecheck.status).toBe('missing')
    expect(missingResult.behavior.counts.skipped).toBeGreaterThan(0)
    expect(missingResult.behavior.counts.passed).toBe(0)
    expect(missingResult.axe.counts.skipped).toBe(task.axeStates.length)
    expect(missingResult.visual.skippedCount).toBe(task.visualStates.length)
    expect(missingResult.visual.notice).toContain('unreviewed')
  })

  it('parses CLI flags accurately', () => {
    const parsed = parseEvalCliArgs([
      '--provider',
      'anthropic',
      '--model',
      'claude-sonnet-4-20250514',
      '--budget',
      '4.5',
      '--tasks',
      'login-form,paginated-table',
      '--conditions',
      'docs-only,docs+mcp',
      '--allow-paid',
      '--skip-browser',
    ])
    expect(parsed.provider).toBe('anthropic')
    expect(parsed.model).toBe('claude-sonnet-4-20250514')
    expect(parsed.budgetUsd).toBe(4.5)
    expect(parsed.tasks).toEqual(['login-form', 'paginated-table'])
    expect(parsed.conditions).toEqual(['docs-only', 'docs+mcp'])
    expect(parsed.allowPaid).toBe(true)
    expect(parsed.skipBrowser).toBe(true)
  })
})

describe('full offline eval run (docs-only vs docs+mcp with live ghostvue-mcp stdio)', () => {
  it('runs both comparison conditions across all 5 tasks, records MCP stamp & separate dimensions, and writes per-run artifacts', async () => {
    const outDir = await makeTempDir('ghostvue-eval-runs-')
    const { report, resultsPath, summaryPath } = await runEval({
      repositoryRoot,
      provider: 'mock',
      mockProfile: 'comparison',
      outDir,
      runId: 'test-run-001',
      skipBrowser: true,
      ensureMcpBuilt: true,
    })

    expect(existsSync(resultsPath)).toBe(true)
    expect(existsSync(summaryPath)).toBe(true)
    expect(report.runId).toBe('test-run-001')
    expect(report.budget.budgetUsd).toBe(5)
    expect(report.budget.spentUsd).toBe(0)
    expect(report.environment.mcp?.assetBundleId).toMatch(/^sha256:/)
    expect(report.trials).toHaveLength(10)

    const docsOnlySummary = report.comparisonSummary.find(
      (s) => s.condition === 'docs-only',
    )
    const docsMcpSummary = report.comparisonSummary.find(
      (s) => s.condition === 'docs+mcp',
    )
    expect(docsMcpSummary?.typecheckPassed).toBe(5)
    expect(docsMcpSummary?.eslintPassed).toBe(5)
    expect(docsMcpSummary?.constraintsPassed).toBe(5)
    expect(docsMcpSummary?.buildPassed).toBe(5)

    // In comparison profile, docs-only uses GhostDataTable on paginated-table & unknown prop on validation-error-form.
    expect(docsOnlySummary?.constraintsPassed).toBeLessThan(5)
    expect(docsOnlySummary?.eslintPassed).toBeLessThan(5)

    // Verify docs+mcp trials actually invoked the live MCP stdio tools.
    const mcpTrial = report.trials.find(
      (t) => t.condition === 'docs+mcp' && t.taskId === 'async-combobox-search',
    )
    expect(
      mcpTrial?.toolTrace.some((step) => step.tool === 'get_component'),
    ).toBe(true)
    expect(mcpTrial?.toolTrace.every((step) => step.ok)).toBe(true)

    const summaryMarkdown = await readFile(summaryPath, 'utf8')
    expect(summaryMarkdown).toContain(
      'Comparison summary (separate dimensions)',
    )
    expect(summaryMarkdown).toContain('unreviewed')
  }, 300_000)
})
