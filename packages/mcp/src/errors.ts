import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { type ZodError } from 'zod'

import { toolContractSchemaVersion } from './contract.js'

/** Error codes a GhostVue MCP tool can return (GHO-17 plan §10). */
export const toolErrorCodes = [
  'INVALID_INPUT',
  'NOT_FOUND',
  'VERSION_MISMATCH',
  'MANIFEST_INVALID',
  'INTERNAL',
] as const

/** One of {@link toolErrorCodes}. */
export type ToolErrorCode = (typeof toolErrorCodes)[number]

/**
 * The §10 error envelope. It is serialized as JSON into the text content of an
 * `isError: true` tool result.
 */
export interface ToolErrorEnvelope {
  readonly code: ToolErrorCode
  readonly message: string
  readonly data: {
    /** Name of the tool that failed. */
    readonly tool: string
    /** `@ghostvue/mcp` version that produced the error. */
    readonly ghostvueVersion: string
    /** Tool contract version, so clients can parse `data` safely. */
    readonly schemaVersion: typeof toolContractSchemaVersion
  }
}

/**
 * A failure a tool handler reports deliberately.
 *
 * Its message is part of the public contract and reaches the client verbatim,
 * so it must not contain filesystem paths, stack traces, or other host
 * details. Any other thrown value becomes a sanitized `INTERNAL` error.
 */
export class GhostvueToolError extends Error {
  readonly code: ToolErrorCode

  constructor(code: ToolErrorCode, message: string) {
    super(message)
    this.name = 'GhostvueToolError'
    this.code = code
  }
}

/** Fixed `INTERNAL` message: unexpected errors may carry paths or stacks. */
export function internalErrorMessage(tool: string): string {
  return `Unexpected internal error in ${tool}. See the server's stderr log for details.`
}

/**
 * Summarizes Zod issues as `path: message` pairs. Zod 4 issue messages
 * describe the expected shape rather than echo the received value, so client
 * input is not reflected back verbatim. `pathPrefix` names the field when the
 * schema that failed validated a single property.
 */
export function formatZodIssues(
  error: ZodError,
  pathPrefix: readonly string[] = [],
): string {
  return error.issues
    .map((issue) => {
      const path = [...pathPrefix, ...issue.path.map(String)].join('.')
      return path === '' ? issue.message : `${path}: ${issue.message}`
    })
    .join('; ')
}

/** Builds the §10 envelope for an error that is already classified. */
export function createErrorEnvelope(
  code: ToolErrorCode,
  message: string,
  tool: string,
  ghostvueVersion: string,
): ToolErrorEnvelope {
  return {
    code,
    message,
    data: { tool, ghostvueVersion, schemaVersion: toolContractSchemaVersion },
  }
}

/**
 * Wraps an envelope as an MCP tool error result.
 *
 * The envelope travels as JSON text, not `structuredContent`: MCP clients
 * validate any `structuredContent` against the tool's `outputSchema` (the SDK
 * client does so even when `isError` is set), and the envelope is not a
 * success payload.
 */
export function toErrorResult(envelope: ToolErrorEnvelope): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(envelope) }],
  }
}
