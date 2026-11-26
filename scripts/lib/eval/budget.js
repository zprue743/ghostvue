/**
 * Fail-closed budget preflight and runtime spending ledger for agent evals
 * (GHO-23 / issue #306).
 *
 * Paid runs are manual-only, default to a $5 total cap across BOTH comparison
 * conditions and all selected tasks, refuse to run under CI, and fail closed
 * whenever provider pricing or turn/token bounds cannot be proven under cap.
 */

export const DEFAULT_MAX_BUDGET_USD = 5.0
export const HARD_MAX_BUDGET_USD = 50.0

/** @type {import('./types.d.ts').EvalRunSettings} */
export const DEFAULT_RUN_SETTINGS = Object.freeze({
  temperature: 0,
  maxTurnsPerTrial: 6,
  maxInputTokensPerTurn: 24_000,
  maxOutputTokensPerTurn: 4_096,
  maxRetries: 0,
})

const MOCK_PRICING = Object.freeze({
  inputPer1MTokensUsd: 0,
  outputPer1MTokensUsd: 0,
  pricingRevision: '2026-11-25-mock',
})

/**
 * Pinned USD rates per 1M tokens. Unknown models fail closed so an eval run
 * never hits an unpriced model with an open checkbook.
 */
export const MODEL_PRICING = Object.freeze({
  mock: Object.freeze({
    'mock-deterministic-v1': MOCK_PRICING,
  }),
  anthropic: Object.freeze({
    'claude-sonnet-4-20250514': {
      inputPer1MTokensUsd: 3.0,
      outputPer1MTokensUsd: 15.0,
      pricingRevision: '2026-11-25',
    },
    'claude-3-5-sonnet-20241022': {
      inputPer1MTokensUsd: 3.0,
      outputPer1MTokensUsd: 15.0,
      pricingRevision: '2026-11-25',
    },
    'claude-3-5-haiku-20241022': {
      inputPer1MTokensUsd: 0.8,
      outputPer1MTokensUsd: 4.0,
      pricingRevision: '2026-11-25',
    },
  }),
  openai: Object.freeze({
    'gpt-4.1': {
      inputPer1MTokensUsd: 2.0,
      outputPer1MTokensUsd: 8.0,
      pricingRevision: '2026-11-25',
    },
    'gpt-4.1-mini': {
      inputPer1MTokensUsd: 0.4,
      outputPer1MTokensUsd: 1.6,
      pricingRevision: '2026-11-25',
    },
    'gpt-4o': {
      inputPer1MTokensUsd: 2.5,
      outputPer1MTokensUsd: 10.0,
      pricingRevision: '2026-11-25',
    },
    'gpt-4o-mini': {
      inputPer1MTokensUsd: 0.15,
      outputPer1MTokensUsd: 0.6,
      pricingRevision: '2026-11-25',
    },
  }),
  gemini: Object.freeze({
    'gemini-2.5-pro': {
      inputPer1MTokensUsd: 1.25,
      outputPer1MTokensUsd: 10.0,
      pricingRevision: '2026-11-25',
    },
    'gemini-2.5-flash': {
      inputPer1MTokensUsd: 0.3,
      outputPer1MTokensUsd: 2.5,
      pricingRevision: '2026-11-25',
    },
  }),
})

export class EvalBudgetError extends Error {
  /**
   * @param {import('./budget.d.ts').EvalBudgetErrorCode} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    this.name = 'EvalBudgetError'
    this.code = code
  }
}

/**
 * Returns true when running inside CI / automated PR workflows, where paid LLM
 * calls must never execute.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function isCiEnvironment(env = process.env) {
  return (
    isTruthyEnv(env.CI) ||
    isTruthyEnv(env.GITHUB_ACTIONS) ||
    isTruthyEnv(env.CONTINUOUS_INTEGRATION)
  )
}

/**
 * @param {string | undefined} value
 * @returns {boolean}
 */
function isTruthyEnv(value) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized !== '' && normalized !== '0' && normalized !== 'false'
}

/**
 * @param {number} value
 * @returns {boolean}
 */
function isFiniteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/**
 * @param {number} value
 * @returns {boolean}
 */
function isPositiveInteger(value) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value > 0
  )
}

/**
 * @param {import('./types.d.ts').EvalProviderName} provider
 * @param {string} model
 * @param {import('./types.d.ts').ModelPricing} [customPricing]
 * @returns {import('./types.d.ts').ModelPricing | null}
 */
export function resolveModelPricing(provider, model, customPricing) {
  if (customPricing) {
    if (
      isFiniteNonNegative(customPricing.inputPer1MTokensUsd) &&
      isFiniteNonNegative(customPricing.outputPer1MTokensUsd) &&
      typeof customPricing.pricingRevision === 'string' &&
      customPricing.pricingRevision.trim() !== ''
    ) {
      return customPricing
    }
    return null
  }
  const providerTable = MODEL_PRICING[provider]
  if (!providerTable) return null
  return Object.hasOwn(providerTable, model) ? providerTable[model] : null
}

/**
 * @param {import('./types.d.ts').ModelPricing} pricing
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number}
 */
export function calculateTokenCostUsd(pricing, inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1MTokensUsd
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1MTokensUsd
  return Number((inputCost + outputCost).toFixed(8))
}

/**
 * Fails closed before any LLM API call unless the total run worst-case cost
 * across all trials (tasks x conditions) is provably within `budgetUsd`.
 *
 * @param {import('./types.d.ts').EvalBudgetConfig} config
 * @returns {import('./types.d.ts').BudgetPreflightResult}
 */
export function evaluateBudgetPreflight(config) {
  const { budgetUsd, provider, model, trialCount, settings } = config

  if (
    typeof budgetUsd !== 'number' ||
    !Number.isFinite(budgetUsd) ||
    budgetUsd <= 0 ||
    budgetUsd > HARD_MAX_BUDGET_USD
  ) {
    throw new EvalBudgetError(
      'INVALID_BUDGET',
      `Eval budget must be a finite USD amount in (0, ${String(HARD_MAX_BUDGET_USD)}]; received ${String(budgetUsd)}.`,
    )
  }

  if (!isPositiveInteger(trialCount)) {
    throw new EvalBudgetError(
      'UNBOUNDED_EXECUTION_LIMITS',
      `Trial count must be a positive integer; received ${String(trialCount)}.`,
    )
  }

  if (
    !settings ||
    !isPositiveInteger(settings.maxTurnsPerTrial) ||
    !isPositiveInteger(settings.maxInputTokensPerTurn) ||
    !isPositiveInteger(settings.maxOutputTokensPerTurn) ||
    typeof settings.maxRetries !== 'number' ||
    !Number.isInteger(settings.maxRetries) ||
    settings.maxRetries < 0
  ) {
    throw new EvalBudgetError(
      'UNBOUNDED_EXECUTION_LIMITS',
      'Eval run settings must define finite positive maxTurnsPerTrial, maxInputTokensPerTurn, maxOutputTokensPerTurn, and non-negative integer maxRetries.',
    )
  }

  if (provider !== 'mock') {
    if (isCiEnvironment(config.env)) {
      throw new EvalBudgetError(
        'PAID_CALLS_BLOCKED_IN_CI',
        `Paid eval provider "${provider}" is blocked in CI/automated environments. Run locally with --allow-paid or use --provider mock.`,
      )
    }
    if (config.allowPaid !== true) {
      throw new EvalBudgetError(
        'PAID_RUN_NOT_AUTHORIZED',
        `Paid eval provider "${provider}" requires explicit manual authorization (--allow-paid) and a per-run budget cap.`,
      )
    }
    if (settings.maxRetries > 0) {
      throw new EvalBudgetError(
        'UNBOUNDED_EXECUTION_LIMITS',
        'Automatic retries (maxRetries > 0) are disabled for paid eval runs to prevent budget surprises.',
      )
    }
  }

  const pricing = resolveModelPricing(provider, model, config.customPricing)
  if (!pricing) {
    throw new EvalBudgetError(
      'BUDGET_UNBOUNDED',
      `Cannot bound cost for provider "${provider}" and model "${model}": no pinned pricing entry is available (fail-closed).`,
    )
  }

  const worstCasePerCallUsd = calculateTokenCostUsd(
    pricing,
    settings.maxInputTokensPerTurn,
    settings.maxOutputTokensPerTurn,
  )
  const callsPerTrial = settings.maxTurnsPerTrial * (1 + settings.maxRetries)
  const maxCalls = trialCount * callsPerTrial
  const worstCasePerTrialUsd = Number(
    (worstCasePerCallUsd * callsPerTrial).toFixed(8),
  )
  const worstCaseTotalUsd = Number(
    (worstCasePerTrialUsd * trialCount).toFixed(8),
  )

  if (worstCaseTotalUsd > budgetUsd + 1e-9) {
    throw new EvalBudgetError(
      'BUDGET_PREFLIGHT_EXCEEDED',
      `Worst-case run cost $${worstCaseTotalUsd.toFixed(4)} across ${String(trialCount)} trial(s) (${String(maxCalls)} max calls) exceeds total run budget $${budgetUsd.toFixed(2)}. Reduce selected tasks/turns/maxOutputTokens or raise --budget.`,
    )
  }

  return {
    ok: true,
    budgetUsd,
    trialCount,
    maxCalls,
    pricing,
    worstCasePerCallUsd,
    worstCasePerTrialUsd,
    worstCaseTotalUsd,
    headroomUsd: Number(Math.max(0, budgetUsd - worstCaseTotalUsd).toFixed(8)),
  }
}

export class BudgetLedger {
  /** @type {number} */
  #budgetUsd
  /** @type {import('./types.d.ts').EvalProviderName} */
  #provider
  /** @type {import('./types.d.ts').ModelPricing} */
  #pricing
  /** @type {number} */
  #spentUsd = 0
  /** @type {number} */
  #inputTokens = 0
  /** @type {number} */
  #outputTokens = 0
  /** @type {number} */
  #calls = 0
  /** @type {boolean} */
  #exhausted = false

  /**
   * @param {{
   *   budgetUsd: number
   *   provider: import('./types.d.ts').EvalProviderName
   *   pricing: import('./types.d.ts').ModelPricing
   * }} options
   */
  constructor(options) {
    if (
      typeof options.budgetUsd !== 'number' ||
      !Number.isFinite(options.budgetUsd) ||
      options.budgetUsd <= 0
    ) {
      throw new EvalBudgetError(
        'INVALID_BUDGET',
        `BudgetLedger requires a positive finite budgetUsd; got ${String(options.budgetUsd)}.`,
      )
    }
    this.#budgetUsd = options.budgetUsd
    this.#provider = options.provider
    this.#pricing = options.pricing
  }

  /**
   * Fail closed before sending an LLM call if the call's worst-case cost could
   * push total spending above the run cap.
   *
   * @param {number} worstCaseCallUsd
   */
  assertCanExecuteCall(worstCaseCallUsd) {
    if (
      typeof worstCaseCallUsd !== 'number' ||
      !Number.isFinite(worstCaseCallUsd) ||
      worstCaseCallUsd < 0
    ) {
      this.#exhausted = true
      throw new EvalBudgetError(
        'BUDGET_UNBOUNDED',
        'Next call worst-case cost is not bounded; aborting fail-closed.',
      )
    }
    if (
      this.#exhausted ||
      this.#spentUsd >= this.#budgetUsd - 1e-9 ||
      this.#spentUsd + worstCaseCallUsd > this.#budgetUsd + 1e-9
    ) {
      this.#exhausted = true
      throw new EvalBudgetError(
        'BUDGET_EXHAUSTED',
        `Run budget $${this.#budgetUsd.toFixed(4)} exhausted (spent $${this.#spentUsd.toFixed(4)}, next call worst-case $${worstCaseCallUsd.toFixed(4)}).`,
      )
    }
  }

  /**
   * @param {{ inputTokens?: number, outputTokens?: number }} usage
   * @returns {import('./types.d.ts').TokenUsage}
   */
  recordTurnUsage(usage) {
    const inputTokens = usage.inputTokens
    const outputTokens = usage.outputTokens
    if (
      !isFiniteNonNegative(inputTokens ?? NaN) ||
      !isFiniteNonNegative(outputTokens ?? NaN)
    ) {
      if (this.#provider !== 'mock') {
        this.#exhausted = true
        throw new EvalBudgetError(
          'USAGE_MISSING',
          `Paid provider "${this.#provider}" returned missing/non-finite token usage; failing closed.`,
        )
      }
      const zero = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      }
      this.#calls += 1
      return zero
    }

    const safeInput = /** @type {number} */ (inputTokens)
    const safeOutput = /** @type {number} */ (outputTokens)
    const costUsd = calculateTokenCostUsd(this.#pricing, safeInput, safeOutput)
    this.#inputTokens += safeInput
    this.#outputTokens += safeOutput
    this.#spentUsd = Number((this.#spentUsd + costUsd).toFixed(8))
    this.#calls += 1

    if (this.#spentUsd > this.#budgetUsd + 1e-9) {
      this.#exhausted = true
    }

    return {
      inputTokens: safeInput,
      outputTokens: safeOutput,
      totalTokens: safeInput + safeOutput,
      costUsd,
    }
  }

  /** @returns {import('./types.d.ts').BudgetLedgerSnapshot} */
  snapshot() {
    return {
      budgetUsd: this.#budgetUsd,
      spentUsd: this.#spentUsd,
      remainingUsd: Number(
        Math.max(0, this.#budgetUsd - this.#spentUsd).toFixed(8),
      ),
      inputTokens: this.#inputTokens,
      outputTokens: this.#outputTokens,
      totalTokens: this.#inputTokens + this.#outputTokens,
      calls: this.#calls,
      exhausted: this.#exhausted,
    }
  }
}
