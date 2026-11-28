/**
 * Read-only inventory of runnable example placement across the component
 * guides (issue #428): for every `docs/components/<slug>.md` guide, the
 * `<GhostExample>` embeds in display order with their registry layer and the
 * heading they sit under.
 *
 * Embeds are found with the docs app's own markdown transforms
 * (`expandExampleSnippets`, `mapOutsideFences`) so the inventory counts
 * exactly the hosts the VitePress build turns into live previews: quoted tags
 * inside fences are illustrations and are skipped, and so is anything inside
 * an HTML comment, which never reaches the rendered page. Layers come from
 * `examples/registry.ts`, the catalog docs and the playground already share.
 * Spec pages (`*-spec.md`, `spec-template.md`) and the generated
 * `docs/reference/` pages are not guides and are never scanned.
 *
 * Nothing here writes to the checkout.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  importTypeScriptModule,
  loadExampleCatalog,
} from './mcp-asset-sources.js'

export const COMPONENT_GUIDES_DIRECTORY = 'docs/components'

/**
 * Spec pages describe embeds in prose (and sometimes quote the tag); only the
 * hand-written guides render live previews for readers.
 *
 * @param {string} fileName
 */
export function isComponentGuideFile(fileName) {
  return (
    fileName.endsWith('.md') &&
    !fileName.endsWith('-spec.md') &&
    fileName !== 'spec-template.md'
  )
}

/**
 * VitePress removes front matter before markdown-it runs, so a YAML comment
 * (`# note`) there must not read as a heading.
 *
 * @param {string} markdown
 */
function stripFrontMatter(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const match = /^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/.exec(normalized)
  return match ? normalized.slice(match[0].length) : normalized
}

const ATX_HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm

/**
 * An HTML comment, or an unterminated one running to the end of the chunk
 * (markdown-it keeps an open `<!--` block going to the end of the document).
 */
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g

/**
 * Commented-out markup is dropped by the Vue template compiler, so a
 * `<!-- <GhostExample … /> -->` (or a heading inside a comment) must not count
 * as a live embed or move the heading context. The region is blanked with
 * spaces rather than deleted so text after `-->` on the same line cannot slide
 * to column 0 and read as an ATX heading; newlines are kept.
 *
 * Applied per chunk outside fences, so `<!--` quoted inside a code fence stays
 * an illustration. A comment that opens before a fence and closes after it is
 * not modelled: guides do not comment out fenced blocks.
 *
 * @param {string} chunk
 */
function blankHtmlComments(chunk) {
  return chunk.replace(HTML_COMMENT, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  )
}

/**
 * Plain heading text: drops a closing `#` run, a `{#custom-id}` anchor, and
 * inline code ticks, which are presentation rather than wording.
 *
 * @param {string} raw
 */
function headingText(raw) {
  return raw
    .replace(/[ \t]+#+$/, '')
    .replace(/[ \t]*\{#[^}]*\}$/, '')
    .replace(/`/g, '')
    .trim()
}

/**
 * Ordered runnable embeds on one guide.
 *
 * The page is first normalized with the build's own rewrite, so self-closing
 * tags, legacy sibling snippets, and already-expanded hosts all become one
 * expanded host each. A self-closing tag that survives normalization has an id
 * the rewrite rejected (`EXAMPLE_ID`); the docs host still mounts it with no
 * registry entry, so it is reported as unresolved instead of being dropped.
 *
 * @param {string} markdown
 * @param {import('./example-inventory.js').DocsExampleParsing} parsing
 * @returns {import('./example-inventory.js').GuideEmbed[]}
 */
export function collectGuideEmbeds(markdown, parsing) {
  const normalized = parsing.expandExampleSnippets(stripFrontMatter(markdown))
  /** @type {import('./example-inventory.js').GuideEmbed[]} */
  const embeds = []
  /** @type {{ text: string; depth: number } | undefined} */
  let heading

  parsing.mapOutsideFences(normalized, (chunk) => {
    const live = blankHtmlComments(chunk)
    /** @type {{ index: number; apply: () => void }[]} */
    const events = []
    for (const match of live.matchAll(ATX_HEADING)) {
      const depth = match[1]?.length ?? 1
      const text = headingText(match[2] ?? '')
      events.push({
        index: match.index,
        apply: () => {
          heading = { text, depth }
        },
      })
    }
    for (const pattern of [parsing.EXAMPLE_SOURCE_BLOCK, parsing.EXAMPLE_TAG]) {
      for (const match of live.matchAll(pattern)) {
        const id = match[1] ?? ''
        events.push({
          index: match.index,
          apply: () => {
            embeds.push({
              id,
              heading: heading?.text ?? null,
              headingDepth: heading?.depth ?? null,
              wellFormed: parsing.EXAMPLE_ID.test(id),
            })
          },
        })
      }
    }
    events.sort((left, right) => left.index - right.index)
    for (const event of events) {
      event.apply()
    }
    return chunk
  })

  return embeds
}

/**
 * @param {string} page
 * @param {import('./example-inventory.js').GuideEmbed[]} embeds
 * @param {ReadonlyMap<string, 'headless' | 'themed'>} layers
 * @returns {import('./example-inventory.js').PageInventory}
 */
export function buildPageInventory(page, embeds, layers) {
  /** @type {Map<string, number>} */
  const seen = new Map()
  const examples = embeds.map((embed, index) => {
    seen.set(embed.id, (seen.get(embed.id) ?? 0) + 1)
    const layer = embed.wellFormed ? (layers.get(embed.id) ?? null) : null
    return {
      position: index + 1,
      id: embed.id,
      layer,
      heading: embed.heading,
      headingDepth: embed.headingDepth,
      /** @type {import('./example-inventory.js').UnresolvedReason | null} */
      unresolved: !embed.wellFormed
        ? 'malformed-id'
        : layer === null
          ? 'unknown-id'
          : null,
    }
  })

  const resolved = examples.filter((example) => example.layer !== null)
  const headless = resolved.filter((example) => example.layer === 'headless')
  const themed = resolved.filter((example) => example.layer === 'themed')
  const lead = resolved[0] ?? null

  return {
    page,
    kind:
      themed.length > 0
        ? 'themed-capable'
        : headless.length > 0
          ? 'headless-only'
          : 'no-examples',
    // A guide leads with its first resolved demo; an unresolved embed has no
    // layer to judge, and it is already listed under `unresolved`.
    lead: lead ? { id: lead.id, layer: lead.layer } : null,
    themedFirst: lead?.layer === 'themed',
    counts: {
      embeds: examples.length,
      headless: headless.length,
      themed: themed.length,
      unresolved: examples.length - resolved.length,
    },
    duplicates: [...seen]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count })),
    examples,
  }
}

/**
 * Locale-independent ordering so the report is byte-identical on any machine
 * for an unchanged checkout.
 *
 * @param {string} left
 * @param {string} right
 */
function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * @param {{
 *   guides: { page: string; markdown: string }[]
 *   catalog: readonly { id: string; layer: 'headless' | 'themed' }[]
 *   parsing: import('./example-inventory.js').DocsExampleParsing
 * }} input
 * @returns {import('./example-inventory.js').ExampleInventory}
 */
export function buildExampleInventory({ guides, catalog, parsing }) {
  const layers = new Map(catalog.map((entry) => [entry.id, entry.layer]))
  const pages = [...guides]
    .sort((left, right) => compareCodeUnits(left.page, right.page))
    .map(({ page, markdown }) =>
      buildPageInventory(page, collectGuideEmbeds(markdown, parsing), layers),
    )

  /** @param {(page: import('./example-inventory.js').PageInventory) => number} pick */
  const sum = (pick) => pages.reduce((total, page) => total + pick(page), 0)

  return {
    pages,
    totals: {
      guides: pages.length,
      themedCapable: pages.filter((page) => page.kind === 'themed-capable')
        .length,
      themedFirst: pages.filter((page) => page.themedFirst).length,
      headlessOnly: pages.filter((page) => page.kind === 'headless-only')
        .length,
      noExamples: pages.filter((page) => page.kind === 'no-examples').length,
      embeds: sum((page) => page.counts.embeds),
      headless: sum((page) => page.counts.headless),
      themed: sum((page) => page.counts.themed),
      unresolved: sum((page) => page.counts.unresolved),
    },
    unresolved: pages.flatMap((page) =>
      page.examples
        .filter((example) => example.unresolved !== null)
        .map((example) => ({
          page: page.page,
          id: example.id,
          position: example.position,
          reason:
            /** @type {import('./example-inventory.js').UnresolvedReason} */ (
              example.unresolved
            ),
        })),
    ),
  }
}

const KIND_LABELS = {
  'themed-capable': 'themed-capable guide',
  'headless-only': 'headless-only utility',
  'no-examples': 'no runnable examples',
}

/**
 * Plain-text report: one block per guide with its ordered embeds, then the
 * totals and any unresolved page/ID pairs.
 *
 * @param {import('./example-inventory.js').ExampleInventory} inventory
 */
export function formatExampleInventory(inventory) {
  const lines = []
  for (const page of inventory.pages) {
    const { counts } = page
    const flags = [KIND_LABELS[page.kind]]
    if (page.themedFirst) flags.push('themed-first')
    if (page.duplicates.length > 0) flags.push('duplicates')
    lines.push(`${page.page} — ${flags.join(', ')}`)
    lines.push(
      `  embeds ${String(counts.embeds)}: headless ${String(counts.headless)}, themed ${String(counts.themed)}, unresolved ${String(counts.unresolved)}`,
    )
    if (page.lead) {
      lines.push(`  lead: ${page.lead.id} [${page.lead.layer}]`)
    }
    for (const example of page.examples) {
      const layer = example.layer ?? `unresolved: ${String(example.unresolved)}`
      const heading = example.heading ?? '(before first heading)'
      lines.push(
        `  ${String(example.position)}. ${example.id} [${layer}] — ${heading}`,
      )
    }
    for (const duplicate of page.duplicates) {
      lines.push(
        `  duplicate: ${duplicate.id} embedded ${String(duplicate.count)} times`,
      )
    }
    lines.push('')
  }

  const { totals } = inventory
  lines.push(
    `Totals: ${String(totals.guides)} guides (${String(totals.themedCapable)} themed-capable, ${String(totals.themedFirst)} themed-first; ${String(totals.headlessOnly)} headless-only; ${String(totals.noExamples)} without examples)`,
  )
  lines.push(
    `Embeds: ${String(totals.embeds)} (headless ${String(totals.headless)}, themed ${String(totals.themed)}, unresolved ${String(totals.unresolved)})`,
  )
  for (const entry of inventory.unresolved) {
    lines.push(
      `Unresolved: ${entry.page} #${String(entry.position)} ${entry.id} (${entry.reason})`,
    )
  }
  return lines.join('\n') + '\n'
}

/**
 * The docs transforms are TypeScript with extensionless imports, so they load
 * through the same Vite module runner the MCP asset bundle uses.
 *
 * @param {string} repositoryRoot
 * @returns {Promise<import('./example-inventory.js').DocsExampleParsing>}
 */
export async function loadDocsExampleParsing(repositoryRoot) {
  /** @type {typeof import('../../apps/docs/.vitepress/expand-example-snippets')} */
  const snippets = await importTypeScriptModule(
    repositoryRoot,
    'apps/docs/.vitepress/expand-example-snippets.ts',
  )
  /** @type {typeof import('../../apps/docs/.vitepress/markdown-fences')} */
  const fences = await importTypeScriptModule(
    repositoryRoot,
    'apps/docs/.vitepress/markdown-fences.ts',
  )
  return {
    expandExampleSnippets: snippets.expandExampleSnippets,
    mapOutsideFences: fences.mapOutsideFences,
    EXAMPLE_TAG: snippets.EXAMPLE_TAG,
    EXAMPLE_SOURCE_BLOCK: snippets.EXAMPLE_SOURCE_BLOCK,
    EXAMPLE_ID: snippets.EXAMPLE_ID,
  }
}

/**
 * Accepts `data-table`, `data-table.md`, or `docs/components/data-table.md`.
 *
 * @param {string} filter
 */
function guidePathForFilter(filter) {
  const fileName = filter
    .replace(/^\.?\/?docs\/components\//, '')
    .replace(/\.md$/, '')
  return `${COMPONENT_GUIDES_DIRECTORY}/${fileName}.md`
}

/**
 * @param {{ repositoryRoot: string; pages?: string[] }} options
 * @returns {Promise<import('./example-inventory.js').ExampleInventory>}
 */
export async function readExampleInventory({ repositoryRoot, pages = [] }) {
  const directory = join(repositoryRoot, COMPONENT_GUIDES_DIRECTORY)
  const available = (await readdir(directory))
    .filter(isComponentGuideFile)
    .map((fileName) => `${COMPONENT_GUIDES_DIRECTORY}/${fileName}`)

  let selected = available
  if (pages.length > 0) {
    const wanted = pages.map(guidePathForFilter)
    const unknown = wanted.filter((page) => !available.includes(page))
    if (unknown.length > 0) {
      throw new Error(
        `Not a component guide: ${unknown.join(', ')} (spec pages and docs/reference are not inventoried).`,
      )
    }
    selected = [...new Set(wanted)]
  }

  const guides = await Promise.all(
    selected.map(async (page) => ({
      page,
      markdown: await readFile(join(repositoryRoot, page), 'utf8'),
    })),
  )
  const [catalog, parsing] = await Promise.all([
    loadExampleCatalog(repositoryRoot),
    loadDocsExampleParsing(repositoryRoot),
  ])
  return buildExampleInventory({ guides, catalog, parsing })
}
