import type { BudgetLedger } from './budget.d.ts'
import type { EvalToolEnvironment } from './mcp-client.d.ts'
import type {
  EvalCondition,
  EvalProviderName,
  EvalRunSettings,
  EvalTaskDefinition,
  MockProfile,
  TokenUsage,
  ToolTraceEntry,
} from './types.d.ts'

export interface AgentTrialOutcome {
  readonly status: 'completed' | 'failed' | 'aborted-budget'
  readonly sfcSource: string | null
  readonly toolTrace: readonly ToolTraceEntry[]
  readonly usage: TokenUsage
  readonly error?: string
}

export function extractVueSfc(text: string): string | null

export function buildSystemPrompt(condition: EvalCondition): string

export function runAgentTrial(options: {
  provider: EvalProviderName
  model: string
  condition: EvalCondition
  task: EvalTaskDefinition
  settings: EvalRunSettings
  toolEnv: EvalToolEnvironment
  ledger: BudgetLedger
  worstCasePerCallUsd: number
  mockProfile?: MockProfile
  fetchImpl?: typeof fetch
  env?: NodeJS.ProcessEnv
  mockSolver?: (options: {
    condition: EvalCondition
    task: EvalTaskDefinition
    toolEnv: EvalToolEnvironment
  }) => Promise<{
    sfcSource: string
    inputTokens?: number
    outputTokens?: number
  }>
}): Promise<AgentTrialOutcome>
