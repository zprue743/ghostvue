import { readFile } from 'node:fs/promises'

import * as z from 'zod'

import {
  buildDocsIndex,
  type DocsIndex,
  searchDocsIndex,
  tokenizeQuery,
} from './docs-index.js'
import { GhostvueToolError } from './errors.js'
import { packageStampSources } from './identity.js'
import { defineTool, type GhostvueTool } from './tool.js'

/**
 * Bundled docs corpus (GHO-17 plan §3.4, decision M3): `{ pages: [...] }` in
 * sidebar order, written by the asset bundler from the shared
 * `generateLlmsDocuments`, with `docs/plans/*` already removed.
 */
export const docsPagesFile = 'docs/pages.json'

/** Default and maximum hit count (GHO-17 plan §5.4). */
const defaultLimit = 10
const maxLimit = 25

/**
 * Shape the tool relies on in the bundled corpus. Loose objects let the
 * bundler keep extra page fields (`sourcePath`, `h1`) the tool does not serve.
 */
const pagesFileSchema = z.looseObject({
  pages: z.array(
    z.looseObject({
      section: z.string().min(1),
      title: z.string().min(1),
      link: z.string().min(1),
      description: z.string(),
      body: z.string(),
    }),
  ),
})

const hitSchema = z.strictObject({
  title: z.string().describe('Sidebar link text of the page.'),
  link: z.string().describe('Docs site path, e.g. /components/button.'),
  section: z.string().describe('Top-level sidebar section of the page.'),
  score: z
    .number()
    .positive()
    .describe('BM25 relevance, rounded to 3 decimals. Higher is better.'),
  snippet: z
    .string()
    .describe(
      'Plain-text excerpt around the first match, at most 280 characters, with … where text was cut.',
    ),
})

/**
 * Loads the corpus and builds its index at most once per process; the index
 * is a pure function of the bundled bytes. A rejected load is not cached, so
 * a transient read failure does not poison every later call.
 */
function indexLoader(assetsDirectory: URL): () => Promise<DocsIndex> {
  let pending: Promise<DocsIndex> | undefined
  return () => {
    pending ??= readIndex(new URL(docsPagesFile, assetsDirectory)).catch(
      (error: unknown) => {
        pending = undefined
        throw error
      },
    )
    return pending
  }
}

async function readIndex(file: URL): Promise<DocsIndex> {
  // A missing or unreadable file propagates as a plain error, which the tool
  // wrapper logs in full and reports as a sanitized INTERNAL error.
  const json: unknown = JSON.parse(await readFile(file, 'utf8'))
  const parsed = pagesFileSchema.safeParse(json)
  if (!parsed.success) {
    // Bundled JSON that fails its shape is a release bug (§10). The message
    // reaches the client, so it names the bundled file, never a host path.
    throw new GhostvueToolError(
      'MANIFEST_INVALID',
      `Bundled ${docsPagesFile} does not match the docs corpus shape: ${z.prettifyError(parsed.error)}`,
    )
  }
  return buildDocsIndex(parsed.data.pages)
}

/** Options for {@link createSearchDocsTool}. */
export interface SearchDocsToolOptions {
  /** Directory holding `docs/pages.json`, with a trailing slash. */
  readonly assetsDirectory: URL
}

/**
 * Builds the `search_docs` tool (GHO-17 plan §5.4) over the docs corpus in
 * `assetsDirectory`.
 *
 * Matching is by exact term after lowercasing; there is no stemming or typo
 * tolerance in v1. A query whose every token is shorter than two characters
 * matches nothing and returns no hits rather than an error, because it is a
 * valid, non-empty query.
 */
export function createSearchDocsTool(
  options: SearchDocsToolOptions,
): GhostvueTool {
  const loadIndex = indexLoader(options.assetsDirectory)

  return defineTool({
    name: 'search_docs',
    title: 'Search docs',
    description:
      'Full-text search over the GhostVue docs site pages listed in its sidebar (the llms-full.txt corpus). Ranks pages by BM25 over title, description, and body, matching whole words only (no fuzzy matching), and returns each hit with a short snippet. Use `section` to search one top-level sidebar section, e.g. Components.',
    input: {
      query: z
        .string()
        .refine((value) => value.trim() !== '', 'Must not be empty')
        .describe(
          'Words to search for, separated by whitespace. Words shorter than 2 characters are ignored.',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(maxLimit)
        .default(defaultLimit)
        .describe(
          `Maximum hits returned (1–${String(maxLimit)}). Default ${String(defaultLimit)}.`,
        ),
      section: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Only pages under this top-level sidebar section label, matched exactly, e.g. Components.',
        ),
    },
    output: {
      hits: z
        .array(hitSchema)
        .describe('Matching pages, best first. Empty when nothing matches.'),
    },
    handler: async ({ query, limit, section }) => {
      const index = await loadIndex()
      // Section labels come from the bundle, so they cannot be a static enum
      // in the input schema. An unknown label is still a caller error, and
      // listing the valid labels lets the client correct it in one step.
      if (section !== undefined && !index.sections.includes(section)) {
        throw new GhostvueToolError(
          'INVALID_INPUT',
          `Invalid arguments: section must be one of ${index.sections.join(', ')}.`,
        )
      }

      const hits = searchDocsIndex(index, {
        terms: tokenizeQuery(query),
        limit,
        section,
      })
      const scope = section === undefined ? '' : ` in ${section}`
      return {
        structuredContent: { hits },
        summary:
          hits.length === 0
            ? `No docs pages match${scope}.`
            : `${String(hits.length)} docs page${hits.length === 1 ? '' : 's'}${scope}, best first: ${hits.map((hit) => hit.link).join(', ')}`,
      }
    },
  })
}

/** `search_docs` over the package's own bundled `dist/assets/docs/pages.json`. */
export const searchDocsTool: GhostvueTool = createSearchDocsTool({
  assetsDirectory: packageStampSources().assetsDirectory,
})
