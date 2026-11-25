export const AI_AGENTS_GUIDE_PATH: string
export const CHECKOUT_PLACEHOLDER: string

export interface MarkdownFence {
  lang: string
  body: string
  heading: string
}

export function extractFences(markdown: string): MarkdownFence[]

export interface McpLaunchSnippet {
  host: string
  format: 'json' | 'toml' | 'cli'
  command: string
  args: string[]
}

export function extractMcpLaunchSnippets(markdown: string): McpLaunchSnippet[]

export function resolveMcpLaunch(
  snippet: { command: string; args: readonly string[] },
  pkg: {
    name: string
    bin: Record<string, string>
    packageDirectory: string
    repositoryRoot: string
  },
): { binName: string; binPath: string; pinnedVersion?: string }

export function mentionedMcpToolNames(markdown: string): string[]

export function mentionedEslintRuleIds(markdown: string): string[]
