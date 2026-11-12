import { access, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

import { mapOutsideFences } from './markdown-fences'

const EXAMPLE_TAG = /<GhostExample\s+id=["']([^"']+)["']\s*\/?\s*>/g
const EXAMPLE_ID = /^[a-z][a-z0-9-]+\/[a-z][a-z0-9-]+$/

/**
 * Sidebar shape used by the docs site. Nested groups stay under their
 * top-level section so `llms.txt` H2s match the published nav.
 */
export interface LlmsSidebarItem {
  text: string
  link?: string
  items?: LlmsSidebarItem[]
}

export interface LlmsSidebarGroup {
  text: string
  items: LlmsSidebarItem[]
}

export interface GenerateLlmsDocumentsOptions {
  docsRoot: string
  title: string
  description: string
  sidebar: LlmsSidebarGroup[]
}

export interface LlmsPage {
  section: string
  title: string
  link: string
  sourcePath: string
  h1: string
  description: string
  body: string
}

export interface LlmsDocuments {
  pages: LlmsPage[]
  llmsTxt: string
  llmsFullTxt: string
}

const SCRIPT_SETUP = /<script\b[^>]*\bsetup\b[^>]*>[\s\S]*?<\/script>\n?/gi
const CONTAINER_OPEN = /^:::\s*(\S+)(?:\s+(.*))?$/
const CONTAINER_CLOSE = /^:::\s*$/
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/
const HEADING_H1 = /^#\s+(.+)$/m

/**
 * Build deterministic `llms.txt` and `llms-full.txt` from sidebar pages.
 * Sidebar order is the published catalog; files omitted from the nav stay out.
 */
export async function generateLlmsDocuments(
  options: GenerateLlmsDocumentsOptions,
): Promise<LlmsDocuments> {
  const docsRoot = resolve(options.docsRoot)
  const repoRoot = resolve(docsRoot, '..')
  const pages: LlmsPage[] = []

  for (const group of options.sidebar) {
    for (const entry of collectLinkedItems(group.items, group.text)) {
      const absolutePath = await resolveDocsPagePath(docsRoot, entry.link)
      const source = await expandExampleTags(
        await readFile(absolutePath, 'utf8'),
        repoRoot,
      )
      const body = toPlainMarkdown(source).replace(/^\n+|\n+$/g, '')
      const h1 = extractH1(body) ?? entry.title
      pages.push({
        section: entry.section,
        title: entry.title,
        link: entry.link,
        sourcePath: toPosixPath(relative(repoRoot, absolutePath)),
        h1,
        description: pageDescription(source, body, options.description),
        body,
      })
    }
  }

  return {
    pages,
    llmsTxt: renderLlmsTxt(options.title, options.description, pages),
    llmsFullTxt: renderLlmsFullTxt(pages),
  }
}

export async function writeLlmsTxtFiles(
  options: GenerateLlmsDocumentsOptions & { outDir: string },
): Promise<LlmsDocuments> {
  const documents = await generateLlmsDocuments(options)
  await writeFile(join(options.outDir, 'llms.txt'), documents.llmsTxt, 'utf8')
  await writeFile(
    join(options.outDir, 'llms-full.txt'),
    documents.llmsFullTxt,
    'utf8',
  )
  return documents
}

/**
 * Map a VitePress sidebar link to its markdown source. Directory URLs use
 * `README.md` or `index.md` because that is how VitePress resolves them.
 */
export async function resolveDocsPagePath(
  docsRoot: string,
  link: string,
): Promise<string> {
  const relativeLink = link.replace(/\/+$/, '').replace(/^\//, '')
  const candidates =
    relativeLink === ''
      ? ['index.md', 'README.md']
      : [
          `${relativeLink}.md`,
          `${relativeLink}/index.md`,
          `${relativeLink}/README.md`,
        ]

  for (const candidate of candidates) {
    const absolutePath = resolve(docsRoot, candidate)
    if (await exists(absolutePath)) {
      return absolutePath
    }
  }

  throw new Error(`No markdown source for sidebar link ${link}`)
}

/**
 * Replace docs `<GhostExample id="..." />` tags with the executable SFC source so
 * llms-full.txt still contains copyable examples instead of a Vue host tag.
 */
export async function expandExampleTags(
  source: string,
  repoRoot: string,
): Promise<string> {
  const expandable: { tag: string; id: string }[] = []
  mapOutsideFences(source, (chunk) => {
    EXAMPLE_TAG.lastIndex = 0
    for (const match of chunk.matchAll(EXAMPLE_TAG)) {
      const id = match[1]
      if (id && EXAMPLE_ID.test(id)) {
        expandable.push({ tag: match[0], id })
      }
    }
    return chunk
  })

  let result = source
  const seen = new Set<string>()
  for (const { tag, id } of expandable) {
    if (seen.has(tag)) {
      continue
    }
    seen.add(tag)
    const filePath = join(repoRoot, 'examples', `${id}.vue`)
    const exampleSource = (await readFile(filePath, 'utf8')).replace(/\n+$/, '')
    result = result.replaceAll(tag, `\`\`\`vue\n${exampleSource}\n\`\`\``)
  }

  return result
}

/**
 * Strip VitePress chrome that is noisy in a plain-text LLM corpus, while
 * leaving fenced code (including examples of that chrome) unchanged.
 */
export function toPlainMarkdown(source: string): string {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const withoutFrontmatter = stripFrontmatter(normalized)
  return mapOutsideFences(withoutFrontmatter, (chunk) =>
    convertContainers(stripScriptSetup(chunk)),
  )
}

interface LinkedSidebarPage {
  section: string
  title: string
  link: string
}

function collectLinkedItems(
  items: readonly LlmsSidebarItem[],
  section: string,
): LinkedSidebarPage[] {
  const collected: LinkedSidebarPage[] = []

  for (const item of items) {
    if (item.link) {
      collected.push({ section, title: item.text, link: item.link })
    }
    if (item.items) {
      collected.push(...collectLinkedItems(item.items, section))
    }
  }

  return collected
}

function renderLlmsTxt(
  title: string,
  description: string,
  pages: readonly LlmsPage[],
): string {
  const lines = [
    `# ${title}`,
    '',
    `> ${description}`,
    '',
    'This index lists every published documentation page. Full page markdown is concatenated in sidebar order at /llms-full.txt.',
    '',
  ]

  let currentSection: string | undefined
  for (const page of pages) {
    if (page.section !== currentSection) {
      if (currentSection !== undefined) {
        lines.push('')
      }
      currentSection = page.section
      lines.push(`## ${page.section}`, '')
    }

    const note = page.description ? `: ${page.description}` : ''
    lines.push(`- [${page.title}](${page.link})${note}`)
  }

  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

function renderLlmsFullTxt(pages: readonly LlmsPage[]): string {
  const blocks = pages.map((page) => {
    const bodyWithoutH1 = stripLeadingH1(page.body)
    const parts = [`# ${page.h1}`, `Source: ${page.sourcePath}`]
    if (bodyWithoutH1) {
      parts.push('', bodyWithoutH1)
    }
    return parts.join('\n')
  })

  return `${blocks.join('\n\n')}\n`
}

function pageDescription(
  source: string,
  plain: string,
  fallback: string,
): string {
  const fromBody = firstParagraph(plain)
  if (fromBody) {
    return fromBody
  }

  return frontmatterScalar(source, 'tagline') ?? fallback
}

function firstParagraph(markdown: string): string | undefined {
  const chunks = stripLeadingH1(markdown).split(/\n{2,}/)

  for (let index = 0; index < chunks.length; index += 1) {
    const trimmed = chunks[index]?.trim() ?? ''
    if (!trimmed || isNonProseChunk(trimmed)) {
      continue
    }

    const next = chunks[index + 1]?.trim() ?? ''
    // A line that only labels the following fence is not a useful summary.
    if (trimmed.endsWith(':') && next.startsWith('```')) {
      continue
    }

    return flattenInlineLinks(collapseWhitespace(trimmed)).replace(/:$/, '')
  }

  return undefined
}

function isNonProseChunk(trimmed: string): boolean {
  return (
    /^#{1,6}\s/.test(trimmed) ||
    /^>/m.test(trimmed) ||
    /^[-*+]\s/.test(trimmed) ||
    /^\d+\.\s/.test(trimmed) ||
    trimmed.startsWith('```')
  )
}

function extractH1(markdown: string): string | undefined {
  const heading = HEADING_H1.exec(markdown)?.[1]?.trim()
  if (!heading) {
    return undefined
  }

  return heading
}

function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+(\n+|$)/, '').replace(/^\n+/, '')
}

function stripFrontmatter(source: string): string {
  if (!source.startsWith('---\n')) {
    return source
  }

  const match = FRONTMATTER.exec(source)
  return match ? source.slice(match[0].length) : source
}

function frontmatterScalar(source: string, key: string): string | undefined {
  if (!source.startsWith('---\n')) {
    return undefined
  }

  const match = FRONTMATTER.exec(source)
  const block = match?.[1]
  if (!block) {
    return undefined
  }

  const pattern = new RegExp(`^\\s*${key}:\\s*(.*)$`, 'm')
  const line = pattern.exec(block)?.[1]?.trim()
  if (!line) {
    return undefined
  }

  return unquote(line)
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function stripScriptSetup(chunk: string): string {
  return chunk.replace(SCRIPT_SETUP, '')
}

function convertContainers(chunk: string): string {
  const lines = chunk.split('\n')
  const output: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    const open = CONTAINER_OPEN.exec(line)
    if (!open) {
      output.push(line)
      index += 1
      continue
    }

    index += 1
    const title = open[2]?.trim() ?? ''
    const body: string[] = []
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (CONTAINER_CLOSE.test(current)) {
        index += 1
        break
      }
      body.push(current)
      index += 1
    }

    const quoted = quoteBlock(title, body)
    if (quoted.length > 0) {
      output.push(...quoted)
    }
  }

  return output.join('\n')
}

function quoteBlock(title: string, body: readonly string[]): string[] {
  const lines = [...(title ? [title, ''] : []), ...body]
  while (lines[0] === '') {
    lines.shift()
  }
  while (lines.at(-1) === '') {
    lines.pop()
  }

  return lines.map((line) => (line === '' ? '>' : `> ${line}`))
}

function flattenInlineLinks(value: string): string {
  // llms.txt file-list notes should stay link-free so the index remains
  // trivially parseable as one `[name](url)` per list item.
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
