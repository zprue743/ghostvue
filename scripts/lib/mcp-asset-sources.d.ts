/** One docs page as produced by `generateLlmsDocuments` (GHO-17 plan §3.4). */
export interface DocsCorpusPage {
  section: string
  title: string
  link: string
  sourcePath: string
  h1: string
  description: string
  body: string
}

/** Example metadata from `examples/registry.ts` (GHO-17 plan §3.3). */
export interface ExampleCatalogEntry {
  id: `${string}/${string}`
  title: string
  description: string
  layer: 'headless' | 'themed'
}

export function buildDocsCorpusPages(
  repositoryRoot: string,
): Promise<DocsCorpusPage[]>

export function generateDocsCorpusPages(
  repositoryRoot: string,
): Promise<DocsCorpusPage[]>

export function loadExampleCatalog(
  repositoryRoot: string,
): Promise<ExampleCatalogEntry[]>
