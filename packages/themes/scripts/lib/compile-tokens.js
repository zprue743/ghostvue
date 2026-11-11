/**
 * Compiles DTCG JSON in packages/themes/tokens into CSS custom properties,
 * typed TypeScript constants, a JSON catalog, and the docs token page.
 *
 * Primitive files contribute both modes. Semantic files set the default
 * (light, and any token that does not change by mode). `semantic.dark.json`
 * overlays dark `$value`s onto existing semantic tokens so mode switching
 * stays in data rather than a proprietary DTCG extension.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const TOKEN_SCHEMA_VERSION = '1.0.0'
export const TOKEN_PACKAGE_NAME = '@slop-ui/themes'
export const DEFAULT_THEME_NAME = 'default'
export const TOKEN_MODES = ['light', 'dark']
export const CSS_PREFIX = '--sl-'
export const THEME_ATTRIBUTE = 'data-sl-theme'
export const MODE_ATTRIBUTE = 'data-sl-mode'

const ALIAS = /^\{([a-z0-9]+(?:\.[a-z0-9-]+)*)\}$/i
const TOKEN_NAME = /^[a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9-]*)+$/
const CSS_HOST = `:where(.slop-theme, .slop-themed-scope, [data-sl-theme='default'])`
const SYSTEM_HOST = `${CSS_HOST}:not([data-sl-mode]):not(:where([data-sl-mode] *))`

export const TOKEN_SOURCES = [
  { file: 'primitives.json', tier: 'primitive' },
  { file: 'semantic.json', tier: 'semantic' },
  { file: 'semantic.dark.json', tier: 'semantic', overlayMode: 'dark' },
]

export function cssVariableName(tokenName) {
  return `${CSS_PREFIX}${tokenName.replaceAll('.', '-')}`
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTokenNode(value) {
  return isPlainObject(value) && Object.hasOwn(value, '$value')
}

function authoredText(value, label) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  throw new Error(`${label} must be a string or number $value`)
}

function parseAlias(value) {
  const match = value.match(ALIAS)
  return match ? match[1] : null
}

function flattenTokens(node, path, file) {
  if (!isPlainObject(node)) {
    throw new Error(
      `${file}: expected an object at ${path.join('.') || '(root)'}`,
    )
  }

  const tokens = []
  if (isTokenNode(node)) {
    if (path.length === 0) {
      throw new Error(`${file}: the document root cannot be a token`)
    }
    const name = path.join('.')
    if (!TOKEN_NAME.test(name)) {
      throw new Error(`${file}: token name "${name}" is not dotted role.part…`)
    }
    const type = node.$type
    if (typeof type !== 'string' || type.trim() === '') {
      throw new Error(`${file}: token "${name}" is missing $type`)
    }
    const description =
      typeof node.$description === 'string' ? node.$description : ''
    tokens.push({
      name,
      type: type.trim(),
      description,
      authored: authoredText(node.$value, `${file} token "${name}"`),
    })
    // A rest-state token may nest interaction states (bg + bg.hover).
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue
      if (!isPlainObject(child)) {
        throw new Error(
          `${file}: "${[...path, key].join('.')}" must be a group or a token`,
        )
      }
      tokens.push(...flattenTokens(child, [...path, key], file))
    }
    return tokens
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    if (!isPlainObject(child)) {
      throw new Error(
        `${file}: "${[...path, key].join('.')}" must be a group or a token`,
      )
    }
    tokens.push(...flattenTokens(child, [...path, key], file))
  }
  return tokens
}

function resolveAuthored(tokensByName, name, mode, stack) {
  const token = tokensByName.get(name)
  if (!token) {
    throw new Error(`Unknown token "${name}"`)
  }
  const nextStack = [...stack, `${name}:${mode}`]
  if (stack.includes(`${name}:${mode}`)) {
    throw new Error(`Cyclic token alias: ${nextStack.join(' -> ')}`)
  }
  const authored = token.authored[mode]
  const alias = parseAlias(authored)
  if (!alias) return authored
  if (token.tier === 'primitive') {
    const target = tokensByName.get(alias)
    if (target && target.tier !== 'primitive') {
      throw new Error(
        `Primitive token "${name}" may not alias semantic token "${alias}"`,
      )
    }
  }
  return resolveAuthored(tokensByName, alias, mode, nextStack)
}

function aliasTarget(authored) {
  return parseAlias(authored)
}

export function compileTokenDocuments(documents) {
  /** @type {Map<string, { name: string, type: string, description: string, tier: string, authored: { light: string, dark: string } }>} */
  const tokensByName = new Map()

  for (const document of documents) {
    const flattened = flattenTokens(document.tree, [], document.file)
    for (const entry of flattened) {
      if (document.overlayMode) {
        const existing = tokensByName.get(entry.name)
        if (!existing) {
          throw new Error(
            `${document.file}: overlay token "${entry.name}" has no base token`,
          )
        }
        if (existing.tier !== 'semantic' || document.tier !== 'semantic') {
          throw new Error(
            `${document.file}: only semantic tokens may have mode overlays`,
          )
        }
        existing.authored[document.overlayMode] = entry.authored
        if (entry.type !== existing.type) {
          throw new Error(
            `${document.file}: overlay token "${entry.name}" changes $type`,
          )
        }
        continue
      }

      if (tokensByName.has(entry.name)) {
        throw new Error(`${document.file}: duplicate token "${entry.name}"`)
      }
      tokensByName.set(entry.name, {
        name: entry.name,
        type: entry.type,
        description: entry.description,
        tier: document.tier,
        authored: { light: entry.authored, dark: entry.authored },
      })
    }
  }

  const tokens = [...tokensByName.values()]
    .map((token) => {
      const value = {
        light: resolveAuthored(tokensByName, token.name, 'light', []),
        dark: resolveAuthored(tokensByName, token.name, 'dark', []),
      }
      const aliases = {
        light: aliasTarget(token.authored.light),
        dark: aliasTarget(token.authored.dark),
      }
      const compiled = {
        name: token.name,
        type: token.type,
        tier: token.tier,
        description: token.description,
        value,
      }
      if (token.tier === 'semantic') {
        compiled.cssVar = cssVariableName(token.name)
      }
      if (aliases.light || aliases.dark) {
        compiled.aliases = {
          light: aliases.light,
          dark: aliases.dark,
        }
      }
      return compiled
    })
    .sort((left, right) => left.name.localeCompare(right.name))

  return {
    tokens,
    css: renderTokenCss(tokens),
    typescript: renderTokenTypescript(tokens),
    manifest: renderTokenManifest(tokens),
    docsMarkdown: renderTokenDocs(tokens),
  }
}

function semanticTokens(tokens) {
  return tokens.filter((token) => token.tier === 'semantic')
}

function renderCustomProperties(tokens, mode, indent = '    ') {
  return semanticTokens(tokens)
    .map((token) => `${indent}${token.cssVar}: ${token.value[mode]};`)
    .join('\n')
}

export function renderTokenCss(tokens) {
  const lightVars = renderCustomProperties(tokens, 'light')
  const darkVars = renderCustomProperties(tokens, 'dark')
  const nestedDarkVars = renderCustomProperties(tokens, 'dark', '      ')
  return `/*
 * Generated from packages/themes/tokens. Do not edit.
 * Semantic custom properties use --sl-<role>-<part>-<state>.
 * Unset data-sl-mode follows prefers-color-scheme; data-sl-mode overrides
 * on any subtree, including nested theme hosts.
 */
@layer slop-ui-theme {
  ${SYSTEM_HOST} {
${lightVars}
  }

  @media (prefers-color-scheme: dark) {
    ${SYSTEM_HOST} {
${nestedDarkVars}
    }
  }

  :where([data-sl-mode='light']) {
    color-scheme: light;
${lightVars}
  }

  :where([data-sl-mode='dark']) {
    color-scheme: dark;
${darkVars}
  }

  :where(.slop-theme):not([data-sl-mode]):not(:where([data-sl-mode] *)) {
    color-scheme: light dark;
  }
}
`
}

function renderTokenObject(token) {
  const lines = [
    `    name: ${JSON.stringify(token.name)},`,
    token.cssVar ? `    cssVar: ${JSON.stringify(token.cssVar)},` : null,
    `    type: ${JSON.stringify(token.type)},`,
    `    tier: ${JSON.stringify(token.tier)},`,
    `    description: ${JSON.stringify(token.description)},`,
    '    value: {',
    `      light: ${JSON.stringify(token.value.light)},`,
    `      dark: ${JSON.stringify(token.value.dark)},`,
    '    },',
  ].filter((line) => line !== null)
  return `  ${JSON.stringify(token.name)}: {\n${lines.join('\n')}\n  }`
}

export function renderTokenTypescript(tokens) {
  return `/**
 * Compiled design tokens from DTCG JSON. Do not edit.
 * Semantic entries include \`cssVar\`; primitives are catalog-only.
 */

export const tokenModes = ['light', 'dark'] as const

export type TokenMode = (typeof tokenModes)[number]

export const tokens = {
${tokens.map(renderTokenObject).join(',\n')},
} as const

export type TokenName = keyof typeof tokens

export type DesignToken = (typeof tokens)[TokenName]
`
}

export function renderTokenManifest(tokens) {
  return {
    schemaVersion: TOKEN_SCHEMA_VERSION,
    source: 'generated',
    package: TOKEN_PACKAGE_NAME,
    theme: DEFAULT_THEME_NAME,
    modes: [...TOKEN_MODES],
    attributes: {
      theme: THEME_ATTRIBUTE,
      mode: MODE_ATTRIBUTE,
    },
    cssPrefix: CSS_PREFIX,
    tokens,
  }
}

function markdownTable(headers, rows) {
  const header = `| ${headers.join(' | ')} |`
  const divider = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.join(' | ')} |`)
  return [header, divider, ...body].join('\n')
}

function escapeMarkdownCell(value) {
  return value.replaceAll('|', '\\|')
}

function groupByRole(tokens) {
  const groups = new Map()
  for (const token of tokens) {
    const role = token.name.split('.')[0]
    const list = groups.get(role) ?? []
    list.push(token)
    groups.set(role, list)
  }
  return [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )
}

export function renderTokenDocs(tokens) {
  const lines = [
    '<!-- Generated from packages/themes/tokens. Do not edit by hand. -->',
    '',
    '# Design token catalog',
    '',
    'Compiled from DTCG JSON in `@slop-ui/themes`. Semantic tokens are the',
    'public CSS custom properties (`--sl-<role>-<part>-<state>`). Primitive',
    'tokens are aliases for those values and are not published as CSS.',
    'Override a semantic custom property on any subtree; `data-sl-theme` and',
    '`data-sl-mode` nest. Unset `data-sl-mode` follows `prefers-color-scheme`.',
    '',
    'Default theme: `default`. Modes: `light`, `dark`.',
    '',
    'See [design tokens](../architecture/tokens.md) and',
    '[ADR 0007](../adr/0007-token-pipeline.md).',
    '',
    '## Semantic tokens',
    '',
  ]

  for (const [role, roleTokens] of groupByRole(semanticTokens(tokens))) {
    lines.push(`### ${role}`, '')
    lines.push(
      markdownTable(
        ['Token', 'CSS', 'Type', 'Light', 'Dark', 'Description'],
        roleTokens.map((token) => [
          `\`${token.name}\``,
          `\`${token.cssVar}\``,
          token.type,
          `\`${token.value.light}\``,
          `\`${token.value.dark}\``,
          escapeMarkdownCell(token.description),
        ]),
      ),
      '',
    )
  }

  lines.push(
    '## Primitive tokens',
    '',
    'Primitives are not CSS variables. They exist so semantic tokens can',
    'alias a stable palette before SLO-63 generates ramps.',
    '',
  )

  const primitives = tokens.filter((token) => token.tier === 'primitive')
  lines.push(
    markdownTable(
      ['Token', 'Type', 'Value', 'Description'],
      primitives.map((token) => [
        `\`${token.name}\``,
        token.type,
        `\`${token.value.light}\``,
        escapeMarkdownCell(token.description),
      ]),
    ),
    '',
  )

  return `${lines.join('\n')}\n`
}

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export async function loadTokenDocuments(tokensDir, sources = TOKEN_SOURCES) {
  const documents = []
  for (const source of sources) {
    const filePath = join(tokensDir, source.file)
    const tree = JSON.parse(await readFile(filePath, 'utf8'))
    if (!isPlainObject(tree)) {
      throw new Error(`${source.file} must contain a JSON object`)
    }
    documents.push({
      file: source.file,
      tier: source.tier,
      overlayMode: source.overlayMode,
      tree,
    })
  }
  return documents
}

export async function compileThemeTokens(tokensDir) {
  const compiled = compileTokenDocuments(await loadTokenDocuments(tokensDir))
  return {
    ...compiled,
    manifestJson: serializeJson(compiled.manifest),
  }
}

export function themeTokenOutputPaths(packageRoot, docsPath) {
  return {
    css: join(packageRoot, 'src/generated/tokens.css'),
    typescript: join(packageRoot, 'src/generated/tokens.ts'),
    manifest: join(packageRoot, 'src/generated/tokens.json'),
    docs: docsPath,
  }
}

export async function writeThemeTokenOutputs({ packageRoot, docsPath }) {
  const tokensDir = join(packageRoot, 'tokens')
  const compiled = await compileThemeTokens(tokensDir)
  const paths = themeTokenOutputPaths(packageRoot, docsPath)
  await mkdir(dirname(paths.css), { recursive: true })
  await mkdir(dirname(paths.docs), { recursive: true })
  await writeFile(paths.css, compiled.css)
  await writeFile(paths.typescript, compiled.typescript)
  await writeFile(paths.manifest, compiled.manifestJson)
  await writeFile(paths.docs, compiled.docsMarkdown)
  return { compiled, paths }
}
