import { EvalBudgetError } from './budget.js'
import {
  getMockDocsOnlyBaselineSfc,
  getReferenceSolutionSfc,
} from './reference-solutions.js'

/**
 * Extracts a Vue SFC from a fenced ```vue code block or raw SFC text.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function extractVueSfc(text) {
  const fenced = /```(?:vue|html)?\s*\n([\s\S]*?)```/i.exec(text)
  const candidate = fenced?.[1] ? fenced[1].trim() : text.trim()
  if (candidate.includes('<template') && candidate.includes('<script')) {
    return `${candidate}\n`
  }
  return null
}

/**
 * @param {import('./types.d.ts').EvalCondition} condition
 * @returns {string}
 */
export function buildSystemPrompt(condition) {
  const shared = [
    'You are building a single-file Vue 3 component using GhostVue (`@ghostvue/themes` and `@ghostvue/vue`).',
    'Use only real, declared props, slots, v-model bindings, and events.',
    'Keep accessibility, keyboard navigation, and focus restoration intact.',
    'Return the final component inside a single ```vue code block.',
  ]
  if (condition === 'docs+mcp') {
    return [
      ...shared,
      'You have access to the `@ghostvue/mcp` server tools (`list_components`, `get_component`, `get_examples`, `search_docs`, `get_tokens`). Inspect component manifests and working examples before writing code.',
    ].join('\n')
  }
  return [
    ...shared,
    'You have access to GhostVue documentation search/read tools (`docs_search`, `docs_read`). No MCP manifest or example server is connected.',
  ].join('\n')
}

/**
 * Executes a single tool call and records timing and byte count.
 *
 * @param {import('./mcp-client.d.ts').EvalToolEnvironment} toolEnv
 * @param {number} step
 * @param {string} name
 * @param {Record<string, unknown>} args
 * @param {import('./types.d.ts').ToolTraceEntry[]} trace
 * @returns {Promise<string>}
 */
async function invokeRecordedTool(toolEnv, step, name, args, trace) {
  const started = Date.now()
  const result = await toolEnv.callTool(name, args)
  const durationMs = Date.now() - started
  trace.push({
    step,
    tool: name,
    arguments: args,
    ok: result.ok,
    durationMs,
    responseBytes: Buffer.byteLength(result.content, 'utf8'),
    ...(result.error ? { error: result.error } : {}),
  })
  return result.content
}

/**
 * Runs a single trial (`task` x `condition`) using either the deterministic
 * offline `mock` agent or a live paid LLM API (already gated by budget
 * preflight and per-call `BudgetLedger` enforcement).
 *
 * @param {{
 *   provider: import('./types.d.ts').EvalProviderName
 *   model: string
 *   condition: import('./types.d.ts').EvalCondition
 *   task: import('./types.d.ts').EvalTaskDefinition
 *   settings: import('./types.d.ts').EvalRunSettings
 *   toolEnv: import('./mcp-client.d.ts').EvalToolEnvironment
 *   ledger: import('./budget.js').BudgetLedger
 *   worstCasePerCallUsd: number
 *   mockProfile?: import('./types.d.ts').MockProfile
 *   fetchImpl?: typeof fetch
 *   env?: NodeJS.ProcessEnv
 *   mockSolver?: (options: {
 *     condition: import('./types.d.ts').EvalCondition
 *     task: import('./types.d.ts').EvalTaskDefinition
 *     toolEnv: import('./mcp-client.d.ts').EvalToolEnvironment
 *   }) => Promise<{ sfcSource: string, inputTokens?: number, outputTokens?: number }>
 * }} options
 * @returns {Promise<import('./providers.d.ts').AgentTrialOutcome>}
 */
export async function runAgentTrial(options) {
  const {
    provider,
    model,
    condition,
    task,
    settings,
    toolEnv,
    ledger,
    worstCasePerCallUsd,
    mockProfile = 'comparison',
    fetchImpl = fetch,
    env = process.env,
    mockSolver,
  } = options

  /** @type {import('./types.d.ts').ToolTraceEntry[]} */
  const trace = []
  let trialInputTokens = 0
  let trialOutputTokens = 0
  let trialCostUsd = 0

  /** @param {{ inputTokens?: number, outputTokens?: number }} turnUsage */
  const recordTurn = (turnUsage) => {
    const recorded = ledger.recordTurnUsage(turnUsage)
    trialInputTokens += recorded.inputTokens
    trialOutputTokens += recorded.outputTokens
    trialCostUsd = Number((trialCostUsd + recorded.costUsd).toFixed(8))
  }

  try {
    if (provider === 'mock') {
      ledger.assertCanExecuteCall(worstCasePerCallUsd)
      if (mockSolver) {
        const custom = await mockSolver({ condition, task, toolEnv })
        recordTurn({
          inputTokens: custom.inputTokens ?? 0,
          outputTokens: custom.outputTokens ?? 0,
        })
        return {
          status: 'completed',
          sfcSource: extractVueSfc(custom.sfcSource) ?? custom.sfcSource,
          toolTrace: trace,
          usage: {
            inputTokens: trialInputTokens,
            outputTokens: trialOutputTokens,
            totalTokens: trialInputTokens + trialOutputTokens,
            costUsd: trialCostUsd,
          },
        }
      }

      if (condition === 'docs+mcp') {
        const primaryComponent = task.expectedPrimitives[0] ?? 'GhostButton'
        await invokeRecordedTool(
          toolEnv,
          1,
          'list_components',
          { package: '@ghostvue/themes', limit: 20 },
          trace,
        )
        await invokeRecordedTool(
          toolEnv,
          2,
          'get_component',
          { name: primaryComponent, package: '@ghostvue/themes' },
          trace,
        )
        const exampleStem = primaryComponent
          .replace(/^Ghost/, '')
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase()
        await invokeRecordedTool(
          toolEnv,
          3,
          'get_examples',
          { component: exampleStem, limit: 2 },
          trace,
        )
        recordTurn({ inputTokens: 0, outputTokens: 0 })
        return {
          status: 'completed',
          sfcSource: getReferenceSolutionSfc(task.id),
          toolTrace: trace,
          usage: {
            inputTokens: trialInputTokens,
            outputTokens: trialOutputTokens,
            totalTokens: trialInputTokens + trialOutputTokens,
            costUsd: trialCostUsd,
          },
        }
      }

      await invokeRecordedTool(
        toolEnv,
        1,
        'docs_search',
        { query: task.title, limit: 5 },
        trace,
      )
      recordTurn({ inputTokens: 0, outputTokens: 0 })
      return {
        status: 'completed',
        sfcSource: getMockDocsOnlyBaselineSfc(task.id, mockProfile),
        toolTrace: trace,
        usage: {
          inputTokens: trialInputTokens,
          outputTokens: trialOutputTokens,
          totalTokens: trialInputTokens + trialOutputTokens,
          costUsd: trialCostUsd,
        },
      }
    }

    const resultText = await runLiveProviderLoop({
      provider,
      model,
      condition,
      task,
      settings,
      toolEnv,
      ledger,
      worstCasePerCallUsd,
      fetchImpl,
      env,
      trace,
      recordTurn,
    })

    const sfcSource = extractVueSfc(resultText)
    if (!sfcSource) {
      return {
        status: 'failed',
        sfcSource: null,
        toolTrace: trace,
        usage: {
          inputTokens: trialInputTokens,
          outputTokens: trialOutputTokens,
          totalTokens: trialInputTokens + trialOutputTokens,
          costUsd: trialCostUsd,
        },
        error:
          'Model response did not contain a valid Vue SFC (<script> and <template>).',
      }
    }

    return {
      status: 'completed',
      sfcSource,
      toolTrace: trace,
      usage: {
        inputTokens: trialInputTokens,
        outputTokens: trialOutputTokens,
        totalTokens: trialInputTokens + trialOutputTokens,
        costUsd: trialCostUsd,
      },
    }
  } catch (error) {
    if (error instanceof EvalBudgetError) {
      return {
        status: 'aborted-budget',
        sfcSource: null,
        toolTrace: trace,
        usage: {
          inputTokens: trialInputTokens,
          outputTokens: trialOutputTokens,
          totalTokens: trialInputTokens + trialOutputTokens,
          costUsd: trialCostUsd,
        },
        error: `${error.code}: ${error.message}`,
      }
    }
    return {
      status: 'failed',
      sfcSource: null,
      toolTrace: trace,
      usage: {
        inputTokens: trialInputTokens,
        outputTokens: trialOutputTokens,
        totalTokens: trialInputTokens + trialOutputTokens,
        costUsd: trialCostUsd,
      },
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Multi-turn tool loop for Anthropic, OpenAI, and Gemini HTTP APIs.
 * Every single turn performs `ledger.assertCanExecuteCall(worstCasePerCallUsd)`
 * BEFORE sending an HTTP request, with zero automatic retries.
 *
 * @param {{
 *   provider: Exclude<import('./types.d.ts').EvalProviderName, 'mock'>
 *   model: string
 *   condition: import('./types.d.ts').EvalCondition
 *   task: import('./types.d.ts').EvalTaskDefinition
 *   settings: import('./types.d.ts').EvalRunSettings
 *   toolEnv: import('./mcp-client.d.ts').EvalToolEnvironment
 *   ledger: import('./budget.js').BudgetLedger
 *   worstCasePerCallUsd: number
 *   fetchImpl: typeof fetch
 *   env: NodeJS.ProcessEnv
 *   trace: import('./types.d.ts').ToolTraceEntry[]
 *   recordTurn: (usage: { inputTokens?: number, outputTokens?: number }) => void
 * }} options
 * @returns {Promise<string>}
 */
async function runLiveProviderLoop(options) {
  const {
    provider,
    model,
    condition,
    task,
    settings,
    toolEnv,
    ledger,
    worstCasePerCallUsd,
    fetchImpl,
    env,
    trace,
    recordTurn,
  } = options

  const systemPrompt = buildSystemPrompt(condition)
  let stepCounter = 0

  if (provider === 'openai') {
    const apiKey = env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for provider "openai".')
    }
    /** @type {Record<string, unknown>[]} */
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task.prompt },
    ]
    const tools = toolEnv.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))

    for (let turn = 0; turn < settings.maxTurnsPerTrial; turn++) {
      ledger.assertCanExecuteCall(worstCasePerCallUsd)
      const response = await fetchImpl(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: settings.temperature,
            max_tokens: settings.maxOutputTokensPerTurn,
            messages,
            tools,
          }),
        },
      )
      if (!response.ok) {
        throw new Error(
          `OpenAI API HTTP ${String(response.status)}: ${await response.text()}`,
        )
      }
      const data = /** @type {Record<string, any>} */ (await response.json())
      recordTurn({
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      })
      const choice = data.choices?.[0]?.message
      if (!choice) {
        throw new Error('OpenAI API returned no message choice.')
      }
      messages.push(choice)
      const toolCalls = Array.isArray(choice.tool_calls)
        ? choice.tool_calls
        : []
      if (toolCalls.length === 0) {
        return typeof choice.content === 'string' ? choice.content : ''
      }
      for (const call of toolCalls) {
        stepCounter += 1
        const args = JSON.parse(call.function?.arguments || '{}')
        const output = await invokeRecordedTool(
          toolEnv,
          stepCounter,
          String(call.function?.name ?? ''),
          args,
          trace,
        )
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: output,
        })
      }
    }
    throw new Error(
      `Exceeded maxTurnsPerTrial (${String(settings.maxTurnsPerTrial)}) without final SFC.`,
    )
  }

  if (provider === 'anthropic') {
    const apiKey = env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for provider "anthropic".')
    }
    /** @type {Record<string, unknown>[]} */
    const messages = [{ role: 'user', content: task.prompt }]
    const tools = toolEnv.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }))

    for (let turn = 0; turn < settings.maxTurnsPerTrial; turn++) {
      ledger.assertCanExecuteCall(worstCasePerCallUsd)
      const response = await fetchImpl(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            system: systemPrompt,
            temperature: settings.temperature,
            max_tokens: settings.maxOutputTokensPerTurn,
            messages,
            tools,
          }),
        },
      )
      if (!response.ok) {
        throw new Error(
          `Anthropic API HTTP ${String(response.status)}: ${await response.text()}`,
        )
      }
      const data = /** @type {Record<string, any>} */ (await response.json())
      recordTurn({
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      })
      const content = Array.isArray(data.content) ? data.content : []
      messages.push({ role: 'assistant', content })
      const toolUses = content.filter((block) => block?.type === 'tool_use')
      if (toolUses.length === 0) {
        return content
          .filter((block) => block?.type === 'text')
          .map((block) => String(block.text ?? ''))
          .join('\n')
      }
      const toolResults = []
      for (const block of toolUses) {
        stepCounter += 1
        const output = await invokeRecordedTool(
          toolEnv,
          stepCounter,
          String(block.name ?? ''),
          block.input && typeof block.input === 'object' ? block.input : {},
          trace,
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: output,
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }
    throw new Error(
      `Exceeded maxTurnsPerTrial (${String(settings.maxTurnsPerTrial)}) without final SFC.`,
    )
  }

  // Gemini generateContent REST API
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY (or GOOGLE_API_KEY) is required for provider "gemini".',
    )
  }
  /** @type {Record<string, unknown>[]} */
  const contents = [{ role: 'user', parts: [{ text: task.prompt }] }]
  const functionDeclarations = toolEnv.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }))

  for (let turn = 0; turn < settings.maxTurnsPerTrial; turn++) {
    ledger.assertCanExecuteCall(worstCasePerCallUsd)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokensPerTurn,
        },
      }),
    })
    if (!response.ok) {
      throw new Error(
        `Gemini API HTTP ${String(response.status)}: ${await response.text()}`,
      )
    }
    const data = /** @type {Record<string, any>} */ (await response.json())
    recordTurn({
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    })
    const candidateContent = data.candidates?.[0]?.content
    if (!candidateContent) {
      throw new Error('Gemini API returned no candidate content.')
    }
    contents.push(candidateContent)
    const parts = Array.isArray(candidateContent.parts)
      ? candidateContent.parts
      : []
    const functionCalls = parts.filter((part) => part?.functionCall)
    if (functionCalls.length === 0) {
      return parts
        .filter((part) => typeof part?.text === 'string')
        .map((part) => String(part.text))
        .join('\n')
    }
    const responseParts = []
    for (const part of functionCalls) {
      stepCounter += 1
      const call = part.functionCall
      const output = await invokeRecordedTool(
        toolEnv,
        stepCounter,
        String(call.name ?? ''),
        call.args && typeof call.args === 'object' ? call.args : {},
        trace,
      )
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { content: output },
        },
      })
    }
    contents.push({ role: 'user', parts: responseParts })
  }
  throw new Error(
    `Exceeded maxTurnsPerTrial (${String(settings.maxTurnsPerTrial)}) without final SFC.`,
  )
}
