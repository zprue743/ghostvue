import type { ComponentManifest } from './component-manifests.js'

export const COMPONENT_DOCS_DIRECTORY: string
export const MCP_DOCS_PATH: string
export const MCP_SOURCE_DIRECTORY: string
export const MCP_CONTRACT_PATH: string
export const MCP_TOOLS_BLOCK: string

/** The manifest fields the docs API tables render. */
export type DocsApiManifest = Pick<
  ComponentManifest,
  'name' | 'package' | 'props' | 'events' | 'slots'
>

/** One MCP tool as declared by its `defineTool` call. */
export interface McpToolDoc {
  name: string
  title: string
  description: string
  /** Tool-specific input keys, in source order. */
  inputs: string[]
}

export interface GeneratedBlock {
  block: string
  contentStart: number
  contentEnd: number
}

export function beginMarker(block: string): string
export function endMarker(block: string): string

export function renderComponentApi(
  manifest: DocsApiManifest,
  options: { sourcePath: string; headless?: DocsApiManifest },
): string

export function extractMcpTools(source: string, fileName: string): McpToolDoc[]
export function extractToolContractSchemaVersion(source: string): string
export function renderMcpTools(
  tools: McpToolDoc[],
  contract: { schemaVersion: string },
): string

export function findGeneratedBlocks(
  source: string,
  path: string,
): { blocks: GeneratedBlock[]; violations: string[] }
export function findHandwrittenApiTables(
  source: string,
  blocks: readonly GeneratedBlock[],
  path: string,
): string[]
export function replaceGeneratedBlocks(
  source: string,
  blocks: readonly GeneratedBlock[],
  render: (block: string) => string,
): string

export function syncDocsApi(options: {
  repositoryRoot: string
  write: boolean
}): Promise<{ violations: string[]; checked: string[]; written: string[] }>
