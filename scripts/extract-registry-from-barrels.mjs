/**
 * One-time migration aid: extract per-family registry JSON from committed barrels.
 *
 * Usage:
 *   node scripts/extract-registry-from-barrels.mjs          # summary only
 *   node scripts/extract-registry-from-barrels.mjs --write  # emit packages/vue/registry/*.json
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCHEMA_VERSION = '1.0.0'

/** `GhostButton` → `ghost-button`, matching manifest and example ids. */
function pascalToKebab(name) {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** `GhostButton` → `button`, matching `examples/<prefix>/<id>.vue`. */
function componentExamplePrefix(name) {
  const remainder = name.startsWith('Ghost') ? name.slice('Ghost'.length) : name
  return pascalToKebab(remainder)
}
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const writeMode = process.argv.includes('--write')

/** @type {ReadonlySet<string>} */
const PRIMITIVE_VUE_MODULE_BASENAMES = new Set([
  'use-dismissable-layer',
  'use-floating',
  'use-inert-others',
  'use-scroll-lock',
  'get-pagination-range',
  'use-ghost-menu-collection',
  'use-ghost-id',
  'use-controllable-state',
  'use-focus-scope',
  'use-roving-focus',
])

/** @type {ReadonlySet<string>} */
const PRIMITIVE_THEMES_MODULE_BASENAMES = new Set([
  'generated/tokens',
  'flagship-themes',
  'start-theme-transition',
])

/**
 * Split a TypeScript barrel into top-level export statements, preserving exact
 * text (including interior newlines).
 *
 * @param {string} source
 * @returns {string[]}
 */
export function splitExportStatements(source) {
  /** @type {string[]} */
  const statements = []
  let searchFrom = 0

  while (searchFrom < source.length) {
    const exportIndex = findNextExportKeyword(source, searchFrom)
    if (exportIndex === -1) break

    const statementEnd = findExportStatementEnd(source, exportIndex)
    const statement = source.slice(exportIndex, statementEnd)
    statements.push(statement)
    searchFrom = statementEnd
  }

  return statements
}

/**
 * @param {string} source
 * @param {number} fromIndex
 */
function findNextExportKeyword(source, fromIndex) {
  let index = fromIndex
  while (index < source.length) {
    const match = source.indexOf('export', index)
    if (match === -1) return -1
    const before = match === 0 ? '' : source[match - 1]
    const after = source[match + 'export'.length] ?? ''
    if (!isIdentifierChar(before) && !isIdentifierChar(after)) {
      return match
    }
    index = match + 'export'.length
  }
  return -1
}

/** @param {string | undefined} ch */
function isIdentifierChar(ch) {
  return typeof ch === 'string' && /[A-Za-z0-9_$]/.test(ch)
}

/**
 * @param {string} source
 * @param {number} exportIndex
 */
function findExportStatementEnd(source, exportIndex) {
  let index = exportIndex
  let braceDepth = 0
  let sawBrace = false

  while (index < source.length) {
    const char = source[index]
    if (char === '{') {
      braceDepth += 1
      sawBrace = true
    } else if (char === '}') {
      braceDepth -= 1
    }

    if (sawBrace && braceDepth === 0) {
      const tail = source.slice(index + 1)
      const fromMatch = tail.match(/^\s*from\s+['"][^'"]+['"]/)
      if (fromMatch) {
        return index + 1 + fromMatch[0].length
      }
      if (/^\s*;/.test(tail) || /^\s*$/m.test(tail.split('\n')[0] ?? '')) {
        const semi = tail.match(/^\s*;/)
        return index + 1 + (semi ? semi[0].length : 0)
      }
    }

    if (!sawBrace && char === '\n') {
      const lineStart = exportIndex
      const line = source.slice(lineStart, index + 1)
      if (/^\s*export\b[^\n{]*from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) {
        return index + 1
      }
    }

    index += 1
  }

  return source.length
}

/**
 * @param {string} statement
 */
function extractModuleSpecifier(statement) {
  const matches = [...statement.matchAll(/from\s+['"]([^'"]+)['"]/g)]
  return matches.length > 0 ? matches.at(-1)[1] : null
}

/**
 * @param {string} moduleSpecifier
 */
function moduleBasename(moduleSpecifier) {
  if (!moduleSpecifier) return ''
  if (moduleSpecifier.startsWith('@')) return moduleSpecifier
  return moduleSpecifier.replace(/^\.\//, '')
}

/**
 * @param {string} statement
 */
function inferSlugFromGhostExportNames(statement) {
  const names = [...statement.matchAll(/\bGhost[A-Z][A-Za-z0-9]*/g)].map(
    (match) => match[0],
  )
  if (names.length === 0) return null
  const roots = names
    .map((name) => componentExamplePrefix(name))
    .sort((left, right) => right.length - left.length)
  return roots[0] ?? null
}

/**
 * @param {string} moduleSpecifier
 * @param {string} statement
 * @param {ReadonlySet<string>} exampleFamilies
 */
function vueFamilySlug(moduleSpecifier, statement, exampleFamilies) {
  const base = moduleBasename(moduleSpecifier)
  if (PRIMITIVE_VUE_MODULE_BASENAMES.has(base)) {
    return 'primitives'
  }

  if (base === 'menu-collection' || base.endsWith('/menu-collection')) {
    return 'primitives'
  }

  if (base.startsWith('use-ghost-')) {
    return base.slice('use-ghost-'.length)
  }

  if (base.startsWith('ghost-')) {
    return base.slice('ghost-'.length)
  }

  const vueMatch = base.match(/^Ghost([A-Za-z0-9]+)\.vue$/)
  if (vueMatch) {
    return resolveFamilyFromComponentPrefix(
      componentExamplePrefix(`Ghost${vueMatch[1]}`),
      exampleFamilies,
    )
  }

  if (moduleSpecifier === '@ghostvue/vue') {
    const inferred = inferSlugFromGhostExportNames(statement)
    if (inferred) {
      return resolveFamilyFromComponentPrefix(inferred, exampleFamilies)
    }
  }

  return base || 'unknown'
}

/**
 * @param {string} moduleSpecifier
 * @param {string} statement
 * @param {ReadonlySet<string>} exampleFamilies
 */
function themesFamilySlug(moduleSpecifier, statement, exampleFamilies) {
  const base = moduleBasename(moduleSpecifier)
  if (PRIMITIVE_THEMES_MODULE_BASENAMES.has(base)) {
    return 'primitives'
  }

  if (base.startsWith('ghost-')) {
    const rest = base.slice('ghost-'.length)
    return resolveFamilyFromComponentPrefix(rest, exampleFamilies)
  }

  if (moduleSpecifier === '@ghostvue/vue') {
    const inferred = inferSlugFromGhostExportNames(statement)
    if (inferred) {
      return resolveFamilyFromComponentPrefix(inferred, exampleFamilies)
    }
    return 'select'
  }

  return base || 'unknown'
}

/**
 * @param {string} componentPrefix
 * @param {ReadonlySet<string>} exampleFamilies
 */
function resolveFamilyFromComponentPrefix(componentPrefix, exampleFamilies) {
  if (exampleFamilies.has(componentPrefix)) {
    return componentPrefix
  }

  let best = null
  for (const family of exampleFamilies) {
    if (
      componentPrefix === family ||
      componentPrefix.startsWith(`${family}-`)
    ) {
      if (!best || family.length > best.length) {
        best = family
      }
    }
  }

  return best ?? componentPrefix
}

/**
 * @param {string} source
 * @returns {{ id: string, title: string, description: string, layer: string }[]}
 */
function parseExamplesRegistry(source) {
  /** @type {{ id: string, title: string, description: string, layer: string }[]} */
  const examples = []
  const arrayStart = source.indexOf('export const ghostExamples = [')
  if (arrayStart === -1) return examples

  const body = source.slice(arrayStart)
  const objectRegex =
    /\{\s*id:\s*'([^']+)',\s*title:\s*'((?:\\'|[^'])*)',\s*description:\s*'((?:\\'|[^'])*)',\s*layer:\s*'(headless|themed)',\s*\}/gs

  for (const match of body.matchAll(objectRegex)) {
    examples.push({
      id: match[1],
      title: match[2],
      description: match[3],
      layer: match[4],
    })
  }

  return examples
}

/**
 * @param {string} source
 */
function parseDocsNavGhostLinks(source) {
  const componentsStart = source.indexOf("text: 'Components'")
  const architectureStart = source.indexOf("text: 'Architecture'")
  const contributingStart = source.indexOf("text: 'Contributing'")
  const agentsStart = source.indexOf("text: 'AI agents'")

  const componentsSection =
    componentsStart !== -1 && architectureStart !== -1
      ? source.slice(componentsStart, architectureStart)
      : ''
  const contributingSection =
    contributingStart !== -1
      ? source.slice(
          contributingStart,
          agentsStart !== -1 ? agentsStart : source.length,
        )
      : ''

  /** @type {Map<string, { title: string, link: string }>} */
  const componentLinks = new Map()
  /** @type {Map<string, { title: string, link: string }>} */
  const specLinks = new Map()
  /** @type {string[]} */
  const docsComponentNavOrder = []
  /** @type {{ title: string, link: string }[]} */
  const docsSpecNavItems = []

  const itemRegex = /\{\s*text:\s*'([^']+)',\s*link:\s*'([^']+)'/gs

  for (const match of componentsSection.matchAll(itemRegex)) {
    const [title, link] = [match[1], match[2]]
    if (!title.startsWith('Ghost')) continue
    const slug = link.replace(/^\/components\//, '').replace(/\/$/, '')
    if (slug.endsWith('-spec')) continue
    componentLinks.set(slug, { title, link })
    docsComponentNavOrder.push(slug)
  }

  for (const match of contributingSection.matchAll(itemRegex)) {
    const [title, link] = [match[1], match[2]]
    if (!title.startsWith('Ghost')) continue
    const slug = link
      .replace(/^\/components\//, '')
      .replace(/-spec$/, '')
      .replace(/\/$/, '')
    specLinks.set(slug, { title, link })
    docsSpecNavItems.push({ title, link })
  }

  return {
    componentLinks,
    specLinks,
    docsComponentNavOrder,
    docsSpecNavItems,
  }
}

/**
 * @param {unknown} value
 */
function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * @param {string} path
 * @param {unknown} payload
 */
async function writeRegistryJson(path, payload) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, stableStringify(payload), 'utf8')
}

/**
 * @param {ReadonlyMap<string, { vueBarrel: string[], themesBarrel: string[] }>} families
 * @param {string} slug
 * @param {'vue' | 'themes'} kind
 * @param {string} statement
 */
function pushStatement(families, slug, kind, statement) {
  if (!families.has(slug)) {
    families.set(slug, { vueBarrel: [], themesBarrel: [] })
  }
  const bucket = families.get(slug)
  if (kind === 'vue') {
    bucket.vueBarrel.push(statement)
  } else {
    bucket.themesBarrel.push(statement)
  }
}

async function readGitFile(relativePath) {
  const { stdout } = await execFileAsync(
    'git',
    ['show', `origin/master:${relativePath}`],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
  return stdout
}

async function main() {
  const fromMaster = process.argv.includes('--from-master')
  const readSource = (relativePath) =>
    fromMaster
      ? readGitFile(relativePath)
      : readFile(join(repositoryRoot, relativePath), 'utf8')

  const vueBarrelPath = 'packages/vue/src/index.ts'
  const themesBarrelPath = 'packages/themes/src/index.ts'
  const examplesPath = 'examples/registry.ts'
  const docsNavPath = 'apps/docs/.vitepress/docs-nav.ts'

  const [vueSource, themesSource, examplesSource, docsNavSource] =
    await Promise.all([
      readSource(vueBarrelPath),
      readSource(themesBarrelPath),
      readSource(examplesPath),
      readSource(docsNavPath),
    ])

  const examples = parseExamplesRegistry(examplesSource)
  const exampleFamilies = new Set(
    examples.map((example) => example.id.split('/')[0]),
  )

  const vueStatements = splitExportStatements(vueSource)
  const themesStatements = splitExportStatements(themesSource)
  const { componentLinks, specLinks, docsComponentNavOrder, docsSpecNavItems } =
    parseDocsNavGhostLinks(docsNavSource)

  const defaultCssSource = fromMaster
    ? await readGitFile('packages/themes/src/default.css')
    : await readFile(
        join(repositoryRoot, 'packages/themes/src/default.css'),
        'utf8',
      )
  const themesCssImports = defaultCssSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith("@import './") && line.includes('ghost-'))
    .map((line) => line.replace(/^@import '\.\//, '').replace(/';$/, ''))

  const roadmapSource = fromMaster
    ? await readGitFile('docs/roadmap.md')
    : await readFile(join(repositoryRoot, 'docs/roadmap.md'), 'utf8')
  const roadmapTablesStart = roadmapSource.indexOf('## Tier 1')
  const roadmapTablesMarkdown =
    roadmapTablesStart === -1 ? '' : roadmapSource.slice(roadmapTablesStart)

  /** @type {Map<string, { vueBarrel: string[], themesBarrel: string[] }>} */
  const families = new Map()
  /** @type {string[]} */
  const familyOrder = []

  for (const statement of vueStatements) {
    const moduleSpecifier = extractModuleSpecifier(statement)
    const slug = vueFamilySlug(
      moduleSpecifier ?? '',
      statement,
      exampleFamilies,
    )
    pushStatement(families, slug, 'vue', statement)
    if (slug !== 'primitives' && !familyOrder.includes(slug)) {
      familyOrder.push(slug)
    }
  }

  for (const statement of themesStatements) {
    const moduleSpecifier = extractModuleSpecifier(statement)
    if (!moduleSpecifier) continue
    const slug = themesFamilySlug(moduleSpecifier, statement, exampleFamilies)
    pushStatement(families, slug, 'themes', statement)
  }

  const examplesByFamily = new Map()
  for (const example of examples) {
    const family = example.id.split('/')[0]
    if (!examplesByFamily.has(family)) {
      examplesByFamily.set(family, [])
    }
    examplesByFamily.get(family).push(example)
  }

  const registryDir = join(repositoryRoot, 'packages/vue/registry')

  const primitives = families.get('primitives') ?? {
    vueBarrel: [],
    themesBarrel: [],
  }

  const primitivesPayload = {
    schemaVersion: SCHEMA_VERSION,
    slug: 'primitives',
    familyOrder,
    vueBarrel: primitives.vueBarrel,
    vueBarrelOrdered: vueStatements,
    vueBarrelSource: vueSource,
    themesBarrel: primitives.themesBarrel,
    themesBarrelOrdered: themesStatements,
    themesBarrelSource: themesSource
      .replace(/^import '\.\/default\.css'\n\n?/, '')
      .replace(
        /^\/\*\* Themed wrappers.*\n/,
        '/** Themed wrappers and default CSS. One `GhostBadge` or `GhostButton` import loads the stylesheet. */\n',
      ),
    themesCssImports,
    docsComponentNavOrder,
    docsSpecNavItems,
    roadmapTablesMarkdown,
    examplesOrdered: examples,
  }

  const familySlugs = [...families.keys()]
    .filter((slug) => slug !== 'primitives')
    .sort((left, right) => {
      const leftIndex = familyOrder.indexOf(left)
      const rightIndex = familyOrder.indexOf(right)
      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right)
      }
      if (leftIndex === -1) return 1
      if (rightIndex === -1) return -1
      return leftIndex - rightIndex
    })

  /** @type {{ slug: string, path: string }[]} */
  const written = []

  if (writeMode) {
    await writeRegistryJson(
      join(registryDir, 'primitives.registry.json'),
      primitivesPayload,
    )
    written.push({
      slug: 'primitives',
      path: 'packages/vue/registry/primitives.registry.json',
    })

    for (const slug of familySlugs) {
      const bucket = families.get(slug)
      const nav = componentLinks.get(slug)
      const spec = specLinks.get(slug)
      const title =
        nav?.title ??
        slug
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
          .replace(/^/, 'Ghost')

      /** @type {Record<string, unknown>} */
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        slug,
        docs: {
          title,
          specStatus: 'approved',
          ...(nav ? { link: nav.link } : {}),
          ...(spec ? { specLink: spec.link } : {}),
        },
        vueBarrel: bucket?.vueBarrel ?? [],
      }

      if (bucket?.themesBarrel?.length) {
        payload.themesBarrel = bucket.themesBarrel
      }

      const familyExamples = examplesByFamily.get(slug)
      if (familyExamples?.length) {
        payload.examples = familyExamples
      }

      const path = join(registryDir, `${slug}.registry.json`)
      await writeRegistryJson(path, payload)
      written.push({
        slug,
        path: `packages/vue/registry/${slug}.registry.json`,
      })
    }
  }

  console.log(
    writeMode
      ? `Wrote ${String(written.length)} registry file${written.length === 1 ? '' : 's'}.`
      : 'Dry run (pass --write to emit packages/vue/registry/*.registry.json).',
  )
  console.log(
    `Vue exports: ${String(vueStatements.length)} statements → ${String(families.size)} families (${String(primitives.vueBarrel.length)} primitive vue, ${String(familyOrder.length)} ordered non-primitive).`,
  )
  console.log(
    `Themes exports: ${String(themesStatements.length)} statements (${String(primitives.themesBarrel.length)} primitive themes).`,
  )
  console.log(
    `Examples: ${String(examples.length)} entries across ${String(exampleFamilies.size)} families.`,
  )
  console.log(
    `Docs nav: ${String(componentLinks.size)} component links, ${String(specLinks.size)} spec links.`,
  )

  if (!writeMode) {
    console.log(`familyOrder: ${familyOrder.join(', ')}`)
  } else {
    for (const entry of written) {
      console.log(`  ${entry.path}`)
    }
  }
}

const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (isCli) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
