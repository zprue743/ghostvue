export type EvalCondition = 'docs-only' | 'docs+mcp'

export type EvalProviderName = 'mock' | 'anthropic' | 'openai' | 'gemini'

export type MockProfile = 'comparison' | 'reference'

export type CheckStatus = 'passed' | 'failed' | 'skipped' | 'missing'

export type VisualEvidenceStatus =
  'captured-pending-human-review' | 'skipped' | 'failed'

export interface ModelPricing {
  readonly inputPer1MTokensUsd: number
  readonly outputPer1MTokensUsd: number
  readonly pricingRevision: string
}

export interface EvalRunSettings {
  readonly temperature: number
  readonly maxTurnsPerTrial: number
  readonly maxInputTokensPerTurn: number
  readonly maxOutputTokensPerTurn: number
  readonly maxRetries: number
}

export interface EvalBudgetConfig {
  readonly budgetUsd: number
  readonly provider: EvalProviderName
  readonly model: string
  readonly trialCount: number
  readonly settings: EvalRunSettings
  readonly allowPaid?: boolean
  readonly customPricing?: ModelPricing
  readonly env?: NodeJS.ProcessEnv
}

export interface BudgetPreflightResult {
  readonly ok: true
  readonly budgetUsd: number
  readonly trialCount: number
  readonly maxCalls: number
  readonly pricing: ModelPricing
  readonly worstCasePerCallUsd: number
  readonly worstCasePerTrialUsd: number
  readonly worstCaseTotalUsd: number
  readonly headroomUsd: number
}

export interface TokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly costUsd: number
}

export interface BudgetLedgerSnapshot {
  readonly budgetUsd: number
  readonly spentUsd: number
  readonly remainingUsd: number
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly calls: number
  readonly exhausted: boolean
}

export interface ToolTraceEntry {
  readonly step: number
  readonly tool: string
  readonly arguments: Record<string, unknown>
  readonly ok: boolean
  readonly durationMs: number
  readonly responseBytes: number
  readonly error?: string
}

export interface McpStampMetadata {
  readonly version: string
  readonly assetBundleId: string
  readonly manifestSchemaId: string
  readonly schemaVersion: string
}

export interface EvalTaskCheckSpec {
  readonly id: string
  readonly category: 'behavior' | 'keyboard'
  readonly description: string
}

export interface EvalTaskDefinition {
  readonly id:
    | 'login-form'
    | 'settings-dialog'
    | 'async-combobox-search'
    | 'paginated-table'
    | 'validation-error-form'
  readonly version: string
  readonly title: string
  readonly description: string
  readonly prompt: string
  readonly promptHash: string
  readonly expectedPrimitives: readonly string[]
  readonly forbiddenIdentifiers: readonly string[]
  readonly checks: readonly EvalTaskCheckSpec[]
  readonly axeStates: readonly string[]
  readonly visualStates: readonly string[]
}

export interface CheckRecord {
  readonly id: string
  readonly category:
    'typecheck' | 'eslint' | 'constraints' | 'build' | 'behavior' | 'keyboard'
  readonly description: string
  readonly status: CheckStatus
  readonly detail?: string
}

export interface AxeViolationSummary {
  readonly id: string
  readonly impact: string | null
  readonly description: string
  readonly helpUrl: string
  readonly nodeCount: number
}

export interface AxeStateResult {
  readonly state: string
  readonly status: CheckStatus
  readonly passCount: number
  readonly incompleteCount: number
  readonly violationCount: number
  readonly violations: readonly AxeViolationSummary[]
  readonly detail?: string
}

export interface VisualEvidenceRecord {
  readonly state: string
  readonly status: VisualEvidenceStatus
  readonly artifactPath: string | null
  readonly reviewed: false
  readonly humanAssessment: 'unreviewed'
  readonly detail?: string
}

export interface DimensionCounts {
  readonly passed: number
  readonly failed: number
  readonly skipped: number
  readonly missing: number
}

export interface TrialGradingResult {
  readonly constraints: {
    readonly status: CheckStatus
    readonly checks: readonly CheckRecord[]
  }
  readonly eslint: {
    readonly status: CheckStatus
    readonly errorCount: number
    readonly warningCount: number
    readonly messages: readonly string[]
  }
  readonly typecheck: {
    readonly status: CheckStatus
    readonly errorCount: number
    readonly diagnostics: readonly string[]
  }
  readonly build: {
    readonly status: CheckStatus
    readonly detail?: string
  }
  readonly behavior: {
    readonly counts: DimensionCounts
    readonly checks: readonly CheckRecord[]
  }
  readonly keyboard: {
    readonly counts: DimensionCounts
    readonly checks: readonly CheckRecord[]
  }
  readonly axe: {
    readonly counts: DimensionCounts
    readonly states: readonly AxeStateResult[]
  }
  readonly visual: {
    readonly capturedCount: number
    readonly skippedCount: number
    readonly failedCount: number
    readonly artifacts: readonly VisualEvidenceRecord[]
    readonly notice: string
  }
}

export interface TrialResult {
  readonly taskId: EvalTaskDefinition['id']
  readonly taskVersion: string
  readonly taskPromptHash: string
  readonly condition: EvalCondition
  readonly status: 'completed' | 'failed' | 'aborted-budget'
  readonly error?: string
  readonly toolsAvailable: readonly string[]
  readonly toolTrace: readonly ToolTraceEntry[]
  readonly usage: TokenUsage
  readonly generatedFilePath: string | null
  readonly grading: TrialGradingResult
}

export interface ConditionSummary {
  readonly condition: EvalCondition
  readonly trialCount: number
  readonly typecheckPassed: number
  readonly eslintPassed: number
  readonly constraintsPassed: number
  readonly buildPassed: number
  readonly behaviorCounts: DimensionCounts
  readonly keyboardCounts: DimensionCounts
  readonly axeCounts: DimensionCounts
  readonly visualCaptured: number
  readonly visualSkipped: number
  readonly visualFailed: number
  readonly usage: TokenUsage
}

export interface EvalEnvironmentMetadata {
  readonly nodeVersion: string
  readonly platform: string
  readonly arch: string
  readonly gitSha: string
  readonly gitDirty: boolean
  readonly packageVersions: Readonly<Record<string, string>>
  readonly mcp: McpStampMetadata | null
  readonly docsCorpusPageCount: number
}

export interface EvalRunReport {
  readonly schemaVersion: '1.0.0'
  readonly runId: string
  readonly timestamp: string
  readonly taskSetVersion: string
  readonly provider: EvalProviderName
  readonly model: string
  readonly mockProfile?: MockProfile
  readonly settings: EvalRunSettings
  readonly conditions: readonly EvalCondition[]
  readonly tasks: readonly {
    readonly id: EvalTaskDefinition['id']
    readonly version: string
    readonly promptHash: string
    readonly prompt: string
  }[]
  readonly preflight: BudgetPreflightResult
  readonly budget: BudgetLedgerSnapshot
  readonly environment: EvalEnvironmentMetadata
  readonly trials: readonly TrialResult[]
  readonly comparisonSummary: readonly ConditionSummary[]
}
