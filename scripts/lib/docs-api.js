/**
 * Generates and checks the API tables embedded in hand-written docs pages
 * (issue #324): component props, events, and slots from
 * `packages/{vue,themes}/manifests/*.manifest.json`, and the MCP tool list in
 * `docs/tooling/mcp-server.md` from the `defineTool` calls in
 * `packages/mcp/src`.
 *
 * Generated regions use the same `<!-- @generated … begin/end -->` markers as
 * `docs/roadmap.md`. Everything outside the markers stays hand-written prose.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { format, resolveConfig } from 'prettier'
import ts from 'typescript'

import { referenceCode, referenceText } from './component-reference.js'

export const COMPONENT_DOCS_DIRECTORY = 'docs/components'
export const MCP_DOCS_PATH = 'docs/tooling/mcp-server.md'
export const MCP_SOURCE_DIRECTORY = 'packages/mcp/src'
export const MCP_CONTRACT_PATH = 'packages/mcp/src/contract.ts'
export const MCP_TOOLS_BLOCK = 'mcp-tools'

/** Manifest packages a component block can name, keyed by marker prefix. */
const BLOCK_PACKAGES = /** @type {const} */ ({
  vue: '@ghostvue/vue',
  themes: '@ghostvue/themes',
})

const MARKER_RE = /<!-- @generated docs-api:([a-z0-9/-]+) (begin|end) -->/g

// Component pages are `docs/components/<slug>.md`; specs and the spec template
// are approved contracts, not API pages, and the index has no single component.
const NON_COMPONENT_PAGES = new Set(['index.md', 'spec-template.md'])

// A hand-written props/events/slots table outside a generated block is exactly
// the drift this check exists to prevent, so its header row is a violation.
const HANDWRITTEN_API_TABLE_RE =
  /^\|\s*(?:Prop|Event|Emit|Slot)s?\s*\|\s*(?:Type|Payload|Description|Slot props)\s*\|/

// These tables sit in hand-written pages that people, `llms-full.txt`, and the
// MCP `search_docs` corpus read as Markdown source, so they keep backtick code
// and authored inline Markdown instead of the entity-escaped HTML the
// generated reference pages use. Anything VitePress could compile as Vue
// (`{{`), or a backtick that would end a code span early, falls back to the
// reference escaping.
const UNSAFE_FOR_MARKDOWN_RE = /\{\{|\}\}/

/** @param {unknown} value */
function code(value) {
  const raw = String(value).replaceAll(/\r?\n/g, ' ')
  if (raw.includes('`') || UNSAFE_FOR_MARKDOWN_RE.test(raw)) {
    return referenceCode(raw)
  }
  // GFM splits table cells on `|` even inside code spans unless escaped.
  return `\`${raw.replaceAll('|', '\\|')}\``
}

/** @param {unknown} value */
function text(value) {
  const raw = String(value).replaceAll(/\r?\n/g, ' ')
  if (UNSAFE_FOR_MARKDOWN_RE.test(raw) || raw.split('`').length % 2 === 0) {
    return referenceText(raw)
  }
  // Escape HTML only outside code spans, where it would otherwise render as
  // markup; inside a span it is already literal.
  return raw
    .split('`')
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    )
    .join('`')
    .replaceAll('|', '\\|')
}

/** @param {string} block */
export function beginMarker(block) {
  return `<!-- @generated docs-api:${block} begin -->`
}

/** @param {string} block */
export function endMarker(block) {
  return `<!-- @generated docs-api:${block} end -->`
}

/**
 * @param {{ name: string; type: string; default?: unknown; required: boolean; description: string; deprecated?: boolean }} prop
 */
function propRow(prop) {
  let defaultCell = '—'
  if (prop.required) defaultCell = 'Required'
  else if (Object.hasOwn(prop, 'default')) {
    defaultCell = code(JSON.stringify(prop.default))
  }
  const description = prop.deprecated
    ? `**Deprecated.** ${text(prop.description)}`
    : text(prop.description)
  return [code(prop.name), code(prop.type), defaultCell, description]
}

/**
 * @param {string[]} columns
 * @param {string[][]} rows
 */
function table(columns, rows) {
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

/**
 * @typedef {import('./docs-api.d.ts').DocsApiManifest} DocsApiManifest
 */

/**
 * Props, events, and slots tables for one manifest. Empty sections are left
 * out; each table's first column names what it lists.
 *
 * @param {Pick<DocsApiManifest, 'props' | 'events' | 'slots'>} api
 */
function apiTables(api) {
  const sections = []
  if (api.props.length > 0) {
    sections.push(
      table(['Prop', 'Type', 'Default', 'Description'], api.props.map(propRow)),
    )
  }
  if (api.events.length > 0) {
    sections.push(
      table(
        ['Event', 'Payload', 'Description'],
        api.events.map((event) => [
          code(event.name),
          code(event.payloadType),
          text(event.description),
        ]),
      ),
    )
  }
  if (api.slots.length > 0) {
    sections.push(
      table(
        ['Slot', 'Slot props', 'Description'],
        api.slots.map((slot) => [
          code(slot.name),
          slot.props.length > 0
            ? slot.props
                .map((prop) => code(`${prop.name}: ${prop.type}`))
                .join(', ')
            : '—',
          text(slot.description),
        ]),
      ),
    )
  }
  return sections
}

/**
 * Markdown for one component block.
 *
 * A themed block lists only what the wrapper adds to its headless pair
 * (matched by name): the forwarded headless API is already in the page's
 * `vue/` block, and repeating it would double every table.
 *
 * @param {DocsApiManifest} manifest
 * @param {{ sourcePath: string; headless?: DocsApiManifest }} options
 */
export function renderComponentApi(manifest, { sourcePath, headless }) {
  const source = `<!-- Source: ${sourcePath}. Run pnpm docs:api:write after it changes. -->`
  if (headless === undefined) {
    const sections = apiTables(manifest)
    return [
      source,
      ...(sections.length > 0 ? sections : ['No props, events, or slots.']),
    ].join('\n\n')
  }

  const names = (/** @type {{ name: string }[]} */ items) =>
    new Set(items.map((item) => item.name))
  const headlessProps = names(headless.props)
  const headlessEvents = names(headless.events)
  const headlessSlots = names(headless.slots)
  const sections = apiTables({
    props: manifest.props.filter((prop) => !headlessProps.has(prop.name)),
    events: manifest.events.filter((event) => !headlessEvents.has(event.name)),
    slots: manifest.slots.filter((slot) => !headlessSlots.has(slot.name)),
  })
  return [
    source,
    sections.length > 0
      ? `\`${manifest.package}\` adds these to the headless \`${headless.name}\` API, which it forwards:`
      : `\`${manifest.package}\` adds no props, events, or slots to the headless \`${headless.name}\` API, which it forwards.`,
    ...sections,
  ].join('\n\n')
}

/**
 * @typedef {import('./docs-api.d.ts').McpToolDoc} McpToolDoc
 */

/**
 * @param {ts.Expression} node
 * @param {string} context
 */
function stringLiteral(node, context) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  throw new Error(`${context} must be a string literal to be documented`)
}

/**
 * Reads every `defineTool({ name, title, description, input })` call in one
 * MCP source file. The docs check runs in `verify:static`, before anything is
 * built, so it parses the source instead of importing `@ghostvue/mcp`.
 *
 * @param {string} source
 * @param {string} fileName
 * @returns {McpToolDoc[]}
 */
export function extractMcpTools(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  /** @type {McpToolDoc[]} */
  const tools = []
  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineTool' &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      /** @type {Map<string, ts.Expression>} */
      const properties = new Map()
      for (const property of node.arguments[0].properties) {
        if (
          ts.isPropertyAssignment(property) &&
          (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ) {
          properties.set(property.name.text, property.initializer)
        } else if (ts.isShorthandPropertyAssignment(property)) {
          // `{ title }` refers to a variable; stringLiteral() rejects it.
          properties.set(property.name.text, property.name)
        }
      }
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      const where = `${fileName}:${String(line + 1)}`
      const field = (/** @type {string} */ key) => {
        const value = properties.get(key)
        if (value === undefined) {
          throw new Error(`${where}: defineTool call has no ${key}`)
        }
        return stringLiteral(value, `${where}: defineTool ${key}`)
      }
      const input = properties.get('input')
      if (input === undefined || !ts.isObjectLiteralExpression(input)) {
        throw new Error(
          `${where}: defineTool input must be an object literal to be documented`,
        )
      }
      tools.push({
        name: field('name'),
        title: field('title'),
        description: field('description'),
        inputs: input.properties.flatMap((property) =>
          property.name !== undefined &&
          (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
            ? [property.name.text]
            : [],
        ),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return tools
}

/**
 * Value of `export const toolContractSchemaVersion = '…'` in contract.ts.
 *
 * @param {string} source
 */
export function extractToolContractSchemaVersion(source) {
  const match = /export const toolContractSchemaVersion = '([^']+)'/.exec(
    source,
  )
  if (match === null) {
    throw new Error(
      `${MCP_CONTRACT_PATH} no longer declares toolContractSchemaVersion as a string literal`,
    )
  }
  return match[1]
}

/**
 * Markdown for the MCP tool list. `expectedGhostvueVersion` is added to every
 * tool by `defineTool`, so it is stated once instead of in every row.
 *
 * @param {McpToolDoc[]} tools
 * @param {{ schemaVersion: string }} contract
 */
export function renderMcpTools(tools, { schemaVersion }) {
  const sorted = [...tools].sort((left, right) =>
    left.name.localeCompare(right.name, 'en'),
  )
  return [
    `<!-- Source: defineTool calls in ${MCP_SOURCE_DIRECTORY} and ${MCP_CONTRACT_PATH}. Run pnpm docs:api:write after they change. -->`,
    table(
      ['Tool', 'Title', 'Inputs', 'Description'],
      sorted.map((tool) => [
        code(tool.name),
        text(tool.title),
        tool.inputs.length > 0 ? tool.inputs.map(code).join(', ') : '—',
        text(tool.description),
      ]),
    ),
    `Every tool also accepts \`expectedGhostvueVersion\`. Every successful payload carries tool contract \`schemaVersion\` \`${schemaVersion}\` (\`toolContractSchemaVersion\`).`,
  ].join('\n\n')
}

/**
 * Splits a page into its generated blocks. Violations cover unpaired, nested,
 * duplicated, or mismatched markers.
 *
 * @param {string} source
 * @param {string} path
 */
export function findGeneratedBlocks(source, path) {
  /** @type {{ block: string; contentStart: number; contentEnd: number }[]} */
  const blocks = []
  /** @type {string[]} */
  const violations = []
  /** @type {{ block: string; contentStart: number } | null} */
  let open = null
  const seen = new Set()
  for (const match of source.matchAll(MARKER_RE)) {
    const [marker, block, kind] = match
    if (kind === 'begin') {
      if (open !== null) {
        violations.push(
          `${path}: docs-api:${block} begins before docs-api:${open.block} ends`,
        )
        continue
      }
      if (seen.has(block)) {
        violations.push(`${path}: docs-api:${block} appears more than once`)
      }
      seen.add(block)
      open = { block, contentStart: match.index + marker.length }
    } else if (open === null || open.block !== block) {
      violations.push(`${path}: docs-api:${block} end has no matching begin`)
    } else {
      blocks.push({ ...open, contentEnd: match.index })
      open = null
    }
  }
  if (open !== null) {
    violations.push(`${path}: docs-api:${open.block} begin has no end`)
  }
  return { blocks, violations }
}

/**
 * Header rows of props/events/slots tables written outside generated blocks.
 *
 * @param {string} source
 * @param {{ contentStart: number; contentEnd: number }[]} blocks
 * @param {string} path
 */
export function findHandwrittenApiTables(source, blocks, path) {
  /** @type {string[]} */
  const violations = []
  let offset = 0
  let inFence = false
  for (const [index, line] of source.split('\n').entries()) {
    const start = offset
    offset += line.length + 1
    if (/^\s*(?:```|~~~)/.test(line)) inFence = !inFence
    if (inFence || !HANDWRITTEN_API_TABLE_RE.test(line)) continue
    const generated = blocks.some(
      (block) => start >= block.contentStart && start < block.contentEnd,
    )
    if (!generated) {
      violations.push(
        `${path}:${String(index + 1)}: hand-written API table; replace it with a <!-- @generated docs-api:… --> block`,
      )
    }
  }
  return violations
}

/**
 * Replaces each generated block's content, keeping the markers.
 *
 * @param {string} source
 * @param {{ block: string; contentStart: number; contentEnd: number }[]} blocks
 * @param {(block: string) => string} render
 */
export function replaceGeneratedBlocks(source, blocks, render) {
  let output = ''
  let cursor = 0
  for (const block of blocks) {
    output += source.slice(cursor, block.contentStart)
    output += `\n\n${render(block.block).trimEnd()}\n\n`
    cursor = block.contentEnd
  }
  return output + source.slice(cursor)
}

/**
 * @param {string} repositoryRoot
 * @returns {Promise<Map<string, { manifest: DocsApiManifest; sourcePath: string }>>}
 */
async function loadManifests(repositoryRoot) {
  const manifests = new Map()
  for (const directory of Object.keys(BLOCK_PACKAGES)) {
    const relative = `packages/${directory}/manifests`
    const files = (await readdir(join(repositoryRoot, relative))).filter(
      (file) => file.endsWith('.manifest.json'),
    )
    for (const file of files) {
      const sourcePath = `${relative}/${file}`
      const manifest = JSON.parse(
        await readFile(join(repositoryRoot, sourcePath), 'utf8'),
      )
      manifests.set(`${directory}/${file.slice(0, -'.manifest.json'.length)}`, {
        manifest,
        sourcePath,
      })
    }
  }
  return manifests
}

/** @param {string} repositoryRoot */
async function loadMcpTools(repositoryRoot) {
  const directory = join(repositoryRoot, MCP_SOURCE_DIRECTORY)
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort()
  const tools = []
  for (const file of files) {
    tools.push(
      ...extractMcpTools(
        await readFile(join(directory, file), 'utf8'),
        `${MCP_SOURCE_DIRECTORY}/${file}`,
      ),
    )
  }
  const schemaVersion = extractToolContractSchemaVersion(
    await readFile(join(repositoryRoot, MCP_CONTRACT_PATH), 'utf8'),
  )
  return { tools, schemaVersion }
}

/**
 * Regenerates (write) or checks (default) every docs-api block.
 *
 * Every component page must carry a `vue/ghost-<slug>` block, plus a
 * `themes/ghost-<slug>` block when a themed manifest exists, so a component
 * page cannot quietly drop its API table. Other manifests (sub-components) may
 * be embedded wherever a page documents them.
 *
 * @param {{ repositoryRoot: string; write: boolean }} options
 */
export async function syncDocsApi({ repositoryRoot, write }) {
  const manifests = await loadManifests(repositoryRoot)
  /** @type {string[]} */
  const violations = []
  /** @type {string[]} */
  const checked = []
  /** @type {string[]} */
  const written = []

  const pages = (await readdir(join(repositoryRoot, COMPONENT_DOCS_DIRECTORY)))
    .filter(
      (file) =>
        file.endsWith('.md') &&
        !file.endsWith('-spec.md') &&
        !NON_COMPONENT_PAGES.has(file),
    )
    .sort()
    .map((file) => `${COMPONENT_DOCS_DIRECTORY}/${file}`)

  /**
   * @param {string} path
   * @param {string[]} required
   * @param {(block: string) => string | null} render null for unknown blocks
   */
  const syncPage = async (path, required, render) => {
    const absolute = join(repositoryRoot, path)
    const source = await readFile(absolute, 'utf8')
    const parsed = findGeneratedBlocks(source, path)
    const pageViolations = [...parsed.violations]
    const present = new Set(parsed.blocks.map((block) => block.block))
    for (const block of required) {
      if (!present.has(block)) {
        pageViolations.push(
          `${path}: missing ${beginMarker(block)} … ${endMarker(block)} block`,
        )
      }
    }
    for (const block of parsed.blocks) {
      if (render(block.block) === null) {
        pageViolations.push(
          `${path}: docs-api:${block.block} names no known manifest or tool list`,
        )
      }
    }
    pageViolations.push(
      ...findHandwrittenApiTables(source, parsed.blocks, path),
    )
    if (pageViolations.length > 0) {
      violations.push(...pageViolations)
      return
    }

    const updated = replaceGeneratedBlocks(
      source,
      parsed.blocks,
      (block) => render(block) ?? '',
    )
    const options = await resolveConfig(absolute)
    const formatted = await format(updated, { ...options, filepath: absolute })
    checked.push(path)
    if (formatted === source) return
    if (write) {
      await writeFile(absolute, formatted)
      written.push(path)
    } else {
      violations.push(`${path}: generated API tables are stale`)
    }
  }

  /** @param {string} block */
  const renderComponent = (block) => {
    const entry = manifests.get(block)
    if (entry === undefined) return null
    const headless = block.startsWith('themes/')
      ? manifests.get(`vue/${block.slice('themes/'.length)}`)?.manifest
      : undefined
    return renderComponentApi(entry.manifest, {
      sourcePath: entry.sourcePath,
      headless,
    })
  }

  for (const path of pages) {
    const slug = path.slice(COMPONENT_DOCS_DIRECTORY.length + 1, -'.md'.length)
    const required = [`vue/ghost-${slug}`, `themes/ghost-${slug}`].filter(
      (block) => manifests.has(block),
    )
    await syncPage(path, required, renderComponent)
  }

  const mcp = await loadMcpTools(repositoryRoot)
  if (mcp.tools.length === 0) {
    violations.push(`${MCP_SOURCE_DIRECTORY} has no defineTool calls`)
  } else {
    const mcpMarkdown = renderMcpTools(mcp.tools, mcp)
    await syncPage(MCP_DOCS_PATH, [MCP_TOOLS_BLOCK], (block) =>
      block === MCP_TOOLS_BLOCK ? mcpMarkdown : null,
    )
  }

  return { violations, checked, written }
}
