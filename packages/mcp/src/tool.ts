import {
  type CallToolResult,
  type Tool,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js'
import * as z from 'zod'

import {
  ghostvueStampSchema,
  type GhostvueStamp,
  toolContractSchemaVersion,
} from './contract.js'
import {
  createErrorEnvelope,
  formatZodIssues,
  GhostvueToolError,
  internalErrorMessage,
  toErrorResult,
  type ToolErrorCode,
} from './errors.js'

/** Per-call context the server hands to a tool handler. */
export interface ToolContext {
  /** Identity stamped onto every success payload. */
  readonly stamp: GhostvueStamp
}

/** What a tool handler returns on success. */
export interface ToolSuccess<Output> {
  /**
   * Tool-specific `structuredContent` fields. The helper adds the top-level
   * `schemaVersion` and `ghostvue` stamp, so handlers never set them.
   */
  readonly structuredContent: Output
  /**
   * Optional short text for hosts that only surface `content` (GHO-17 plan
   * §5). Keep it to a sentence; the full payload is `structuredContent`.
   */
  readonly summary?: string
}

/**
 * Authoring shape for one read-only GhostVue tool.
 *
 * Shapes are plain Zod object shapes so the helper can add the fields every
 * tool shares (`expectedGhostvueVersion` on input; `schemaVersion` and
 * `ghostvue` on output) without each tool repeating them.
 */
export interface ToolDefinition<
  InputShape extends z.core.$ZodShape,
  OutputShape extends z.core.$ZodShape,
> {
  /** Stable MCP tool name, e.g. `list_components`. */
  readonly name: string
  readonly title: string
  readonly description: string
  /** Tool-specific input fields; unknown keys are rejected as `INVALID_INPUT`. */
  readonly input: InputShape
  /** Tool-specific success fields. */
  readonly output: OutputShape
  /**
   * Does the tool's work against already validated input. Throw
   * {@link GhostvueToolError} for contract failures (`NOT_FOUND`,
   * `MANIFEST_INVALID`, …); anything else becomes a sanitized `INTERNAL`.
   */
  readonly handler: (
    input: z.output<z.ZodObject<InputShape, z.core.$strict>>,
    context: ToolContext,
  ) =>
    | ToolSuccess<z.input<z.ZodObject<OutputShape>>>
    | Promise<ToolSuccess<z.input<z.ZodObject<OutputShape>>>>
}

/** Sink for operator diagnostics. The server writes them to stderr. */
export type DiagnosticLog = (line: string) => void

/**
 * A tool ready to be served: its `tools/list` descriptor plus a call
 * function that already applies the version guard, validation, stamping, and
 * error envelope. Generics are erased here so a server can hold a mixed list.
 */
export interface GhostvueTool {
  readonly name: string
  readonly descriptor: Tool
  readonly call: (
    args: unknown,
    context: ToolContext,
    log: DiagnosticLog,
  ) => Promise<CallToolResult>
}

/**
 * Optional on every tool input (GHO-17 plan §3.1). When it differs from the
 * server's version the call fails with `VERSION_MISMATCH` before any work.
 */
const expectedGhostvueVersionSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'If set and not equal to the server @ghostvue/mcp version, the call fails with VERSION_MISMATCH before doing any work.',
  )

/**
 * Every tool is a pure read over bundled assets (GHO-17 plan §2), so the
 * hints are identical for all of them. `openWorldHint: false` tells hosts the
 * tool never reaches the network or anything outside the bundle.
 */
const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

/**
 * Converts a Zod object to an MCP tool JSON Schema. Draft-07 is the dialect
 * the official SDK emits for Zod schemas and the one its client validator
 * (Ajv default build) understands. Parsing through the SDK's own `Tool` schema
 * narrows Zod's JSON Schema type to the MCP shape without an assertion.
 */
function toToolJsonSchema(
  schema: z.ZodObject,
  io: 'input' | 'output',
): Tool['inputSchema'] {
  return ToolSchema.shape.inputSchema.parse(
    z.toJSONSchema(schema, { target: 'draft-7', io }),
  )
}

/**
 * Splits the shared `expectedGhostvueVersion` guard from the tool's own
 * arguments so the guard can be checked before any tool-specific validation,
 * and so handlers only ever see their declared fields. Non-object arguments
 * are passed through unchanged and fail tool validation as `INVALID_INPUT`.
 */
const guardKey = 'expectedGhostvueVersion'

function splitGuard(args: unknown): { guard: unknown; rest: unknown } {
  // Clients may omit `arguments` for tools whose fields are all optional.
  if (args === undefined) {
    return { guard: undefined, rest: {} }
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return { guard: undefined, rest: args }
  }
  const guard: unknown = Reflect.get(args, guardKey)
  const rest = Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== guardKey),
  )
  return { guard, rest }
}

/**
 * Turns a {@link ToolDefinition} into a {@link GhostvueTool}.
 *
 * Call order: version guard → input validation → handler → output
 * validation. The guard runs first so a client built for another release
 * learns about the mismatch even if its arguments use a shape this version no
 * longer accepts. A payload that fails its own `outputSchema` is a server bug,
 * so it is logged and reported as `INTERNAL` rather than sent to the client.
 */
export function defineTool<
  InputShape extends z.core.$ZodShape,
  OutputShape extends z.core.$ZodShape,
>(definition: ToolDefinition<InputShape, OutputShape>): GhostvueTool {
  const inputSchema = z.strictObject(definition.input)
  const outputSchema = z.object({
    schemaVersion: z.literal(toolContractSchemaVersion),
    ghostvue: ghostvueStampSchema,
    ...definition.output,
  })
  const { name } = definition

  const descriptor: Tool = {
    name,
    title: definition.title,
    description: definition.description,
    inputSchema: toToolJsonSchema(
      inputSchema.extend({
        expectedGhostvueVersion: expectedGhostvueVersionSchema,
      }),
      'input',
    ),
    outputSchema: toToolJsonSchema(outputSchema, 'output'),
    annotations: { title: definition.title, ...readOnlyAnnotations },
  }

  async function call(
    args: unknown,
    context: ToolContext,
    log: DiagnosticLog,
  ): Promise<CallToolResult> {
    const { version } = context.stamp
    const fail = (code: ToolErrorCode, message: string) =>
      toErrorResult(createErrorEnvelope(code, message, name, version))

    const { guard, rest } = splitGuard(args)
    const expected = expectedGhostvueVersionSchema.safeParse(guard)
    if (!expected.success) {
      return fail(
        'INVALID_INPUT',
        `Invalid arguments: ${formatZodIssues(expected.error, ['expectedGhostvueVersion'])}`,
      )
    }
    if (expected.data !== undefined && expected.data !== version) {
      return fail(
        'VERSION_MISMATCH',
        `Expected @ghostvue/mcp ${expected.data}, but this server is ${version}.`,
      )
    }

    const input = inputSchema.safeParse(rest)
    if (!input.success) {
      return fail(
        'INVALID_INPUT',
        `Invalid arguments: ${formatZodIssues(input.error)}`,
      )
    }

    let success: ToolSuccess<z.input<z.ZodObject<OutputShape>>>
    try {
      success = await definition.handler(input.data, context)
    } catch (error) {
      if (error instanceof GhostvueToolError) {
        return fail(error.code, error.message)
      }
      log(`${name} failed: ${describeError(error)}`)
      return fail('INTERNAL', internalErrorMessage(name))
    }

    const payload = outputSchema.safeParse({
      ...success.structuredContent,
      schemaVersion: toolContractSchemaVersion,
      ghostvue: context.stamp,
    })
    if (!payload.success) {
      log(
        `${name} returned structuredContent that does not match its outputSchema: ${formatZodIssues(payload.error)}`,
      )
      return fail('INTERNAL', internalErrorMessage(name))
    }

    return {
      structuredContent: payload.data,
      content:
        success.summary === undefined
          ? []
          : [{ type: 'text', text: success.summary }],
    }
  }

  return { name, descriptor, call }
}

/** Full detail for the operator log only; never sent to the client. */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`
  }
  return String(error)
}
