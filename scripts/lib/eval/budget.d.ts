import type {
  BudgetLedgerSnapshot,
  BudgetPreflightResult,
  EvalBudgetConfig,
  EvalProviderName,
  EvalRunSettings,
  ModelPricing,
  TokenUsage,
} from './types.d.ts'

export const DEFAULT_MAX_BUDGET_USD: number
export const HARD_MAX_BUDGET_USD: number
export const DEFAULT_RUN_SETTINGS: EvalRunSettings
export const MODEL_PRICING: Readonly<
  Record<EvalProviderName, Readonly<Record<string, ModelPricing>>>
>

export type EvalBudgetErrorCode =
  | 'PAID_CALLS_BLOCKED_IN_CI'
  | 'PAID_RUN_NOT_AUTHORIZED'
  | 'INVALID_BUDGET'
  | 'UNBOUNDED_EXECUTION_LIMITS'
  | 'BUDGET_UNBOUNDED'
  | 'BUDGET_PREFLIGHT_EXCEEDED'
  | 'BUDGET_EXHAUSTED'
  | 'USAGE_MISSING'

export class EvalBudgetError extends Error {
  readonly code: EvalBudgetErrorCode
  constructor(code: EvalBudgetErrorCode, message: string)
}

export function isCiEnvironment(env?: NodeJS.ProcessEnv): boolean

export function resolveModelPricing(
  provider: EvalProviderName,
  model: string,
  customPricing?: ModelPricing,
): ModelPricing | null

export function calculateTokenCostUsd(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
): number

export function evaluateBudgetPreflight(
  config: EvalBudgetConfig,
): BudgetPreflightResult

export class BudgetLedger {
  constructor(options: {
    budgetUsd: number
    provider: EvalProviderName
    pricing: ModelPricing
  })
  assertCanExecuteCall(worstCaseCallUsd: number): void
  recordTurnUsage(usage: {
    inputTokens?: number
    outputTokens?: number
  }): TokenUsage
  snapshot(): BudgetLedgerSnapshot
}
