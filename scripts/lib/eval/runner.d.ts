import type { Browser } from '@playwright/test'

import type { EvalToolEnvironment } from './mcp-client.d.ts'
import type {
  EvalCondition,
  EvalProviderName,
  EvalRunReport,
  EvalRunSettings,
  EvalTaskDefinition,
  MockProfile,
  ModelPricing,
} from './types.d.ts'

export interface RunEvalOptions {
  readonly repositoryRoot?: string
  readonly provider?: EvalProviderName
  readonly model?: string
  readonly budgetUsd?: number
  readonly allowPaid?: boolean
  readonly customPricing?: ModelPricing
  readonly tasks?: readonly string[]
  readonly conditions?: readonly EvalCondition[]
  readonly settings?: Partial<EvalRunSettings>
  readonly mockProfile?: MockProfile
  readonly outDir?: string
  readonly runId?: string
  readonly skipTypecheck?: boolean
  readonly skipBrowser?: boolean
  readonly ensureMcpBuilt?: boolean
  readonly browser?: Browser
  readonly env?: NodeJS.ProcessEnv
  readonly fetchImpl?: typeof fetch
  readonly mockSolver?: (options: {
    condition: EvalCondition
    task: EvalTaskDefinition
    toolEnv: EvalToolEnvironment
  }) => Promise<{
    sfcSource: string
    inputTokens?: number
    outputTokens?: number
  }>
}

export function renderEvalSummaryMarkdown(report: EvalRunReport): string

export function parseEvalCliArgs(argv: readonly string[]): RunEvalOptions & {
  readonly help?: boolean
}

export function runEval(options?: RunEvalOptions): Promise<{
  readonly report: EvalRunReport
  readonly runDir: string
  readonly resultsPath: string
  readonly summaryPath: string
}>
