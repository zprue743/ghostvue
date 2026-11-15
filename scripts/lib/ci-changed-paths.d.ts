export function stripMarkdownCode(markdown: string): string

export function isExecutableMarkdown(
  markdown: string | null | undefined,
): boolean

export interface PathClassifierOptions {
  readAtBase?: (file: string) => string | null
  readAtHead?: (file: string) => string | null
}

export function isHeavySkipEligible(
  file: string,
  options?: PathClassifierOptions,
): boolean

export function classifyChangedPaths(params: {
  eventName: string
  files: string[]
  readAtBase?: (file: string) => string | null
  readAtHead?: (file: string) => string | null
}): { skipHeavy: boolean; files: string[] }
