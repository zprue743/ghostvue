export const TOKEN_SCHEMA_VERSION: string
export const TOKEN_PACKAGE_NAME: string
export const DEFAULT_THEME_NAME: string
export const TOKEN_MODES: readonly ['light', 'dark']
export const CSS_PREFIX: string
export const THEME_ATTRIBUTE: string
export const MODE_ATTRIBUTE: string

export interface TokenSource {
  file: string
  tier: 'primitive' | 'semantic'
  overlayMode?: 'light' | 'dark'
}

export const TOKEN_SOURCES: readonly TokenSource[]

export interface CompiledToken {
  name: string
  type: string
  tier: 'primitive' | 'semantic'
  description: string
  value: { light: string; dark: string }
  cssVar?: string
  aliases?: { light: string | null; dark: string | null }
}

export interface TokenDocument {
  file: string
  tier: 'primitive' | 'semantic'
  overlayMode?: 'light' | 'dark'
  tree: Record<string, unknown>
}

export interface TokenManifest {
  schemaVersion: string
  source: 'generated'
  package: string
  theme: string
  modes: string[]
  attributes: { theme: string; mode: string }
  cssPrefix: string
  tokens: CompiledToken[]
}

export interface CompiledTokens {
  tokens: CompiledToken[]
  css: string
  typescript: string
  manifest: TokenManifest
  docsMarkdown: string
}

export function cssVariableName(tokenName: string): string
export function compileTokenDocuments(
  documents: TokenDocument[],
): CompiledTokens
export function forcedColorForToken(token: CompiledToken): string | null
export function renderTokenCss(tokens: CompiledToken[]): string
export function renderTokenTypescript(tokens: CompiledToken[]): string
export function renderTokenManifest(tokens: CompiledToken[]): TokenManifest
export function renderTokenDocs(tokens: CompiledToken[]): string
export function serializeJson(value: unknown): string
export function loadTokenDocuments(
  tokensDir: string,
  sources?: readonly TokenSource[],
): Promise<TokenDocument[]>
export function compileThemeTokens(tokensDir: string): Promise<
  CompiledTokens & {
    manifestJson: string
    rampsJson: string | null
  }
>
export function themeTokenOutputPaths(
  packageRoot: string,
  docsPath: string,
): {
  ramps: string
  css: string
  typescript: string
  manifest: string
  docs: string
}
export function writeThemeTokenOutputs(options: {
  packageRoot: string
  docsPath: string
}): Promise<{
  compiled: CompiledTokens & { manifestJson: string; rampsJson: string | null }
  paths: ReturnType<typeof themeTokenOutputPaths>
}>
