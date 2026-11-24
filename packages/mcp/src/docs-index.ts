/**
 * In-memory search index over the bundled docs corpus (GHO-17 plan §5.4,
 * decision M4): whitespace query tokens, a small field-weighted BM25, and
 * plain-text snippets. Pure functions only, so ranking is testable without a
 * server or asset files.
 */

/** The fields of one bundled docs page (`docs/pages.json`) the index reads. */
export interface DocsPage {
  /** Top-level `docsSidebar` label, e.g. `Components`. */
  readonly section: string
  /** Sidebar link text. */
  readonly title: string
  /** Site path, e.g. `/components/button`. */
  readonly link: string
  readonly description: string
  /** Page markdown after the `llms-full.txt` transforms. */
  readonly body: string
}

/** One ranked result. `score` is rounded for display; ranking is not. */
export interface DocsHit {
  readonly title: string
  readonly link: string
  readonly section: string
  readonly score: number
  readonly snippet: string
}

interface IndexedPage {
  readonly page: DocsPage
  /** Position in the corpus, which the bundler writes in sidebar order. */
  readonly order: number
  readonly sectionOrder: number
  /** Field-weighted term frequency (title ×3, description ×2, body ×1). */
  readonly termFrequency: ReadonlyMap<string, number>
  /** Field-weighted length in terms, with the same weights. */
  readonly length: number
}

/** Built once per bundle by {@link buildDocsIndex}. */
export interface DocsIndex {
  /** Top-level sidebar labels in sidebar order. */
  readonly sections: readonly string[]
  readonly pages: readonly IndexedPage[]
  /** Pages containing each term in any field. */
  readonly documentFrequency: ReadonlyMap<string, number>
  /** Mean field-weighted page length over the corpus. */
  readonly averageLength: number
}

/**
 * Field weights from decision M4. A title occurrence counts as three body
 * occurrences and a description occurrence as two; lengths are weighted the
 * same way, and all fields share one set of corpus statistics (the body's).
 * Per-field length normalization (full BM25F) was tried and rejected: the
 * one-line title and description fields have tiny averages, so a single
 * extra word swung scores more than the weights did.
 */
const fieldWeights = { title: 3, description: 2, body: 1 } as const

/** Standard BM25 parameters (Lucene defaults). */
const k1 = 1.2
const b = 0.75

/** Plan §5.4 step 1: query tokens shorter than this are dropped. */
const minTokenLength = 2

/** Plan §5.4 step 5: snippet length cap, ellipses included. */
export const snippetMaxLength = 280

/** Characters of context kept before the first match in a snippet. */
const leadingContext = 60

const ellipsis = '…'

/**
 * A term is a run of letters and digits, optionally joined by `-`, `_`, or
 * `.`, so identifiers such as `v-model`, `aria-label`, and
 * `action.primary.bg` stay whole while markdown punctuation (`**`, `[`,
 * `](`, backticks) separates words. Query tokens go through the same
 * extraction, so a query matches the text as an exact term only (no
 * stemming or typo tolerance in v1).
 */
const termPattern = /[\p{L}\p{N}]+(?:[-_.][\p{L}\p{N}]+)*/gu

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/**
 * Terms are found in the original text and normalized one by one, so match
 * offsets always index the original text (normalizing the whole text first
 * can change its length, e.g. for ligatures).
 */
function extractTerms(text: string): string[] {
  return Array.from(text.matchAll(termPattern), (match) => normalize(match[0]))
}

/**
 * Plan §5.4 step 1: split on whitespace and drop tokens shorter than two
 * characters. Each kept token is then reduced to its terms (so `button,`
 * searches `button`), terms shorter than two characters are dropped too, and
 * duplicates are removed so repeating a word does not double its weight.
 * May return an empty list, which matches nothing.
 */
export function tokenizeQuery(query: string): string[] {
  const terms = new Set<string>()
  for (const token of query.split(/\s+/u)) {
    if (token.length < minTokenLength) continue
    for (const term of extractTerms(token)) {
      if (term.length >= minTokenLength) terms.add(term)
    }
  }
  return [...terms]
}

/**
 * One-line plain text for snippets: HTML comments (generated-file banners)
 * and heading markers are removed and whitespace is collapsed, so a window
 * reads as prose rather than raw markdown layout.
 */
function toSnippetText(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/^#{1,6}\s+/gmu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function addWeighted(
  frequency: Map<string, number>,
  terms: readonly string[],
  weight: number,
): void {
  for (const term of terms) {
    frequency.set(term, (frequency.get(term) ?? 0) + weight)
  }
}

/**
 * Indexes `pages`, which must be in sidebar order: that order defines the
 * section order used to break score ties.
 */
export function buildDocsIndex(pages: readonly DocsPage[]): DocsIndex {
  const sections: string[] = []
  const documentFrequency = new Map<string, number>()
  let totalLength = 0

  const indexed = pages.map((page, order): IndexedPage => {
    if (!sections.includes(page.section)) sections.push(page.section)
    const title = extractTerms(page.title)
    const description = extractTerms(page.description)
    const body = extractTerms(page.body)
    const termFrequency = new Map<string, number>()
    addWeighted(termFrequency, title, fieldWeights.title)
    addWeighted(termFrequency, description, fieldWeights.description)
    addWeighted(termFrequency, body, fieldWeights.body)
    for (const term of termFrequency.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
    const length =
      title.length * fieldWeights.title +
      description.length * fieldWeights.description +
      body.length * fieldWeights.body
    totalLength += length
    return {
      page,
      order,
      sectionOrder: sections.indexOf(page.section),
      termFrequency,
      length,
    }
  })

  return {
    sections,
    pages: indexed,
    documentFrequency,
    averageLength: indexed.length === 0 ? 0 : totalLength / indexed.length,
  }
}

/**
 * BM25 inverse document frequency in the Lucene form, which stays positive
 * even for a term on every page, so a match never lowers a score.
 */
function inverseDocumentFrequency(index: DocsIndex, term: string): number {
  const pageCount = index.pages.length
  const frequency = index.documentFrequency.get(term) ?? 0
  return Math.log(1 + (pageCount - frequency + 0.5) / (frequency + 0.5))
}

function scorePage(
  index: DocsIndex,
  page: IndexedPage,
  terms: readonly string[],
): number {
  const relativeLength =
    index.averageLength === 0 ? 1 : page.length / index.averageLength
  let score = 0
  for (const term of terms) {
    const frequency = page.termFrequency.get(term)
    if (frequency === undefined) continue
    score +=
      (inverseDocumentFrequency(index, term) * frequency * (k1 + 1)) /
      (frequency + k1 * (1 - b + b * relativeLength))
  }
  return score
}

/** Index of the first whole-term match of any of `terms` in `text`. */
function firstMatch(text: string, terms: ReadonlySet<string>): number {
  for (const match of text.matchAll(termPattern)) {
    if (terms.has(normalize(match[0]))) return match.index
  }
  return -1
}

/**
 * Cuts a window of at most {@link snippetMaxLength} characters (ellipses
 * included) that starts a little before `matchIndex`, snapping both ends to
 * word boundaries where that keeps the match inside the window.
 */
function windowAround(text: string, matchIndex: number): string {
  if (text.length <= snippetMaxLength) return text

  // Start early enough that a match near the end still fills the window.
  let start = Math.max(
    0,
    Math.min(
      matchIndex - leadingContext,
      text.length - (snippetMaxLength - ellipsis.length),
    ),
  )
  if (start > 0 && text[start - 1] !== ' ') {
    const space = text.indexOf(' ', start)
    if (space !== -1 && space < matchIndex) start = space + 1
  }

  const head = start > 0 ? ellipsis : ''
  const room = snippetMaxLength - head.length
  if (text.length - start <= room) return head + text.slice(start)

  let end = start + room - ellipsis.length
  if (text[end] !== ' ') {
    // Backing up to a space must neither drop the match nor give away more
    // than half the window (a long URL or code token is cut mid-word instead).
    const space = text.lastIndexOf(' ', end)
    if (space > Math.max(matchIndex, start + room / 2)) end = space
  }
  return `${head}${text.slice(start, end).trimEnd()}${ellipsis}`
}

/**
 * Plan §5.4 step 5: the first window of the body that contains a query term.
 * A page can match on its title or description alone; it then shows the
 * description when that matches, else the opening of the body.
 */
export function snippetFor(page: DocsPage, terms: readonly string[]): string {
  const wanted = new Set(terms)
  const body = toSnippetText(page.body)
  const bodyMatch = firstMatch(body, wanted)
  if (bodyMatch !== -1) return windowAround(body, bodyMatch)
  const description = toSnippetText(page.description)
  const descriptionMatch = firstMatch(description, wanted)
  if (descriptionMatch !== -1) {
    return windowAround(description, descriptionMatch)
  }
  return windowAround(body, 0)
}

/** Options for {@link searchDocsIndex}. */
export interface DocsSearchOptions {
  /** Output of {@link tokenizeQuery}. */
  readonly terms: readonly string[]
  /** Maximum hits returned. */
  readonly limit: number
  /** Only pages in this top-level section; `undefined` searches all. */
  readonly section?: string | undefined
}

/**
 * Plan §5.4 steps 2–5. Pages are scored against whole-corpus statistics, so a
 * `section` filter narrows the results without changing any page's score.
 * Ties sort by sidebar section order, then link path (code-unit order), then
 * corpus order, so equal inputs always give the same list.
 */
export function searchDocsIndex(
  index: DocsIndex,
  options: DocsSearchOptions,
): DocsHit[] {
  if (options.terms.length === 0) return []
  return index.pages
    .filter(
      (page) =>
        options.section === undefined || page.page.section === options.section,
    )
    .map((page) => ({ page, score: scorePage(index, page, options.terms) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.page.sectionOrder - right.page.sectionOrder ||
        compareCodeUnits(left.page.page.link, right.page.page.link) ||
        left.page.order - right.page.order,
    )
    .slice(0, options.limit)
    .map(({ page: { page }, score }) => ({
      title: page.title,
      link: page.link,
      section: page.section,
      score: Math.round(score * 1000) / 1000,
      snippet: snippetFor(page, options.terms),
    }))
}

/** Locale-independent string order, unlike `localeCompare`. */
function compareCodeUnits(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}
