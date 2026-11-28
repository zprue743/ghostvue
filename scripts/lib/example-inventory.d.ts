export const COMPONENT_GUIDES_DIRECTORY: string

/** The docs app's embed transforms, loaded from `apps/docs/.vitepress`. */
export interface DocsExampleParsing {
  expandExampleSnippets: (source: string) => string
  mapOutsideFences: (
    markdown: string,
    transform: (chunk: string) => string,
  ) => string
  EXAMPLE_TAG: RegExp
  EXAMPLE_SOURCE_BLOCK: RegExp
  EXAMPLE_ID: RegExp
}

/** One live `<GhostExample>` host in document order. */
export interface GuideEmbed {
  id: string
  /** Nearest preceding ATX heading, or `null` before the first one. */
  heading: string | null
  headingDepth: number | null
  /** `false` when the id fails `EXAMPLE_ID`, so the build never expands it. */
  wellFormed: boolean
}

export type ExampleLayer = 'headless' | 'themed'

/** `unknown-id`: no registry entry. `malformed-id`: not a path-shaped id. */
export type UnresolvedReason = 'unknown-id' | 'malformed-id'

/**
 * `themed-capable`: at least one themed demo. `headless-only`: every
 * resolved demo is headless. `no-examples`: no resolved demo at all.
 */
export type GuideKind = 'themed-capable' | 'headless-only' | 'no-examples'

export interface InventoryExample {
  /** 1-based display order on the page. */
  position: number
  id: string
  layer: ExampleLayer | null
  heading: string | null
  headingDepth: number | null
  unresolved: UnresolvedReason | null
}

export interface PageInventory {
  page: string
  kind: GuideKind
  lead: { id: string; layer: ExampleLayer | null } | null
  themedFirst: boolean
  counts: {
    embeds: number
    headless: number
    themed: number
    unresolved: number
  }
  duplicates: { id: string; count: number }[]
  examples: InventoryExample[]
}

export interface ExampleInventory {
  pages: PageInventory[]
  totals: {
    guides: number
    themedCapable: number
    themedFirst: number
    headlessOnly: number
    noExamples: number
    embeds: number
    headless: number
    themed: number
    unresolved: number
  }
  unresolved: {
    page: string
    id: string
    position: number
    reason: UnresolvedReason
  }[]
}

export function isComponentGuideFile(fileName: string): boolean

export function collectGuideEmbeds(
  markdown: string,
  parsing: DocsExampleParsing,
): GuideEmbed[]

export function buildPageInventory(
  page: string,
  embeds: GuideEmbed[],
  layers: ReadonlyMap<string, ExampleLayer>,
): PageInventory

export function buildExampleInventory(input: {
  guides: { page: string; markdown: string }[]
  catalog: readonly { id: string; layer: ExampleLayer }[]
  parsing: DocsExampleParsing
}): ExampleInventory

export function formatExampleInventory(inventory: ExampleInventory): string

export function loadDocsExampleParsing(
  repositoryRoot: string,
): Promise<DocsExampleParsing>

export function readExampleInventory(options: {
  repositoryRoot: string
  pages?: string[]
}): Promise<ExampleInventory>
