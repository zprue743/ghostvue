import type { McpStampMetadata } from './types.d.ts'

export interface DocsCorpusPage {
  readonly title: string
  readonly link: string
  readonly section: string
  readonly description?: string
  readonly body: string
}

export interface EvalToolDefinition {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
}

export interface EvalToolEnvironment {
  readonly tools: readonly EvalToolDefinition[]
  readonly mcpStamp: McpStampMetadata | null
  readonly docsCorpusPageCount: number
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; content: string; error?: string }>
  close(): Promise<void>
}

export function loadDocsCorpus(
  repositoryRoot: string,
): Promise<readonly DocsCorpusPage[]>

export function createDocsOnlyToolEnvironment(
  repositoryRoot: string,
): Promise<EvalToolEnvironment>

export function createMcpToolEnvironment(options: {
  repositoryRoot: string
  ensureBuilt?: boolean
  timeoutMs?: number
}): Promise<EvalToolEnvironment>
