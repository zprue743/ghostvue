/**
 * Compiles DTCG JSON in packages/themes/tokens into CSS custom properties,
 * typed TypeScript constants, a JSON catalog, and the docs token page.
 *
 * Primitive files contribute both modes. Semantic files set the default
 * (light, and any token that does not change by mode). `semantic.dark.json`
 * overlays dark `$value`s onto existing semantic tokens so mode switching
 * stays in data rather than a proprietary DTCG extension.
 *
 * Color ramps are generated from `seeds.json` at compile time and written
 * next to the other outputs. Duration tokens emit
 * `calc(<ms> * var(--sl-motion-intensity, 1))`. Unset `data-sl-mode` follows
 * prefers-color-scheme in CSS, so SSR does not need a flash-prevention script.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { isCompositeValue, serializeComposite } from './composite-tokens.js'
import {
  RAMP_HUES,
  RAMP_STEPS,
  generateRampDocument,
  rampTokenName,
} from './generate-ramps.js'

export const TOKEN_SCHEMA_VERSION = '1.0.0'
export const TOKEN_PACKAGE_NAME = '@slop-ui/themes'
export const DEFAULT_THEME_NAME = 'default'
export const TOKEN_MODES = ['light', 'dark']
export const TOKEN_DENSITIES = ['compact', 'comfortable', 'spacious']
export const DEFAULT_DENSITY = 'comfortable'
export const CSS_PREFIX = '--sl-'
export const THEME_ATTRIBUTE = 'data-sl-theme'
export const MODE_ATTRIBUTE = 'data-sl-mode'
export const DENSITY_ATTRIBUTE = 'data-sl-density'
export const ROUNDNESS_TOKEN_NAME = 'roundness.amount'
export const ROUNDNESS_VAR = `${CSS_PREFIX}roundness`

const ALIAS = /^\{([a-z0-9]+(?:\.[a-z0-9-]+)*)\}$/i
const TOKEN_NAME = /^[a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9-]*)+$/
const CSS_HOST = `:where(.slop-theme, .slop-themed-scope, [data-sl-theme='default'])`
const SYSTEM_HOST = `${CSS_HOST}:not([data-sl-mode]):not(:where([data-sl-mode] *))`

export const TOKEN_SOURCES = [
  { file: 'primitives.json', tier: 'primitive' },
  { file: 'semantic.json', tier: 'semantic' },
  { file: 'semantic.dark.json', tier: 'semantic', overlayMode: 'dark' },
  {
    file: 'semantic.compact.json',
    tier: 'semantic',
    overlayDensity: 'compact',
  },
  {
    file: 'semantic.spacious.json',
    tier: 'semantic',
    overlayDensity: 'spacious',
  },
]

export function cssVariableName(tokenName) {
  // Public knob name is --sl-roundness (0 sharp → 1 designed / pill).
  if (tokenName === ROUNDNESS_TOKEN_NAME) return ROUNDNESS_VAR
  return `${CSS_PREFIX}${tokenName.replaceAll('.', '-')}`
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTokenNode(value) {
  return isPlainObject(value) && Object.hasOwn(value, '$value')
}

function authoredValue(value, label) {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  if (isCompositeValue(value)) {
    return value
  }
  throw new Error(
    `${label} must be a string, number, shadow, gradient, cubicBezier, or spring $value`,
  )
}

function readExtensionString(node, key) {
  const extensions = node.$extensions
  if (!isPlainObject(extensions)) return undefined
  const slop = extensions['slop.ui']
  if (!isPlainObject(slop)) return undefined
  const value = slop[key]
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }
  return value.trim()
}

function readHighDpr(node) {
  return readExtensionString(node, 'highDpr')
}

function readReducedMotion(node) {
  return readExtensionString(node, 'reducedMotion')
}

function readTouchMin(node) {
  return readExtensionString(node, 'touchMin')
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
      authored: authoredValue(node.$value, `${file} token "${name}"`),
      highDpr: readHighDpr(node),
      reducedMotion: readReducedMotion(node),
      touchMin: readTouchMin(node),
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

function assertPrimitiveAlias(tokensByName, fromName, alias) {
  const token = tokensByName.get(fromName)
  if (!token || token.tier !== 'primitive') return
  const target = tokensByName.get(alias)
  if (target && target.tier !== 'primitive') {
    throw new Error(
      `Primitive token "${fromName}" may not alias semantic token "${alias}"`,
    )
  }
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
  return resolveTokenValue(
    tokensByName,
    token.authored[mode],
    mode,
    nextStack,
    name,
  )
}

function interpolateEmbeddedAliases(
  tokensByName,
  value,
  mode,
  stack,
  fromName,
) {
  return value.replace(/\{([a-z0-9]+(?:\.[a-z0-9-]+)*)\}/gi, (match, alias) => {
    if (!tokensByName.has(alias)) {
      throw new Error(`Unknown token "${alias}"`)
    }
    assertPrimitiveAlias(tokensByName, fromName, alias)
    const resolved = resolveAuthored(tokensByName, alias, mode, stack)
    if (typeof resolved === 'object') {
      throw new Error(
        `Token "${fromName}" cannot interpolate composite alias "${alias}"`,
      )
    }
    return String(resolved)
  })
}

function resolveTokenValue(tokensByName, value, mode, stack, fromName) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const alias = parseAlias(value)
    if (alias) {
      assertPrimitiveAlias(tokensByName, fromName, alias)
      return resolveAuthored(tokensByName, alias, mode, stack)
    }
    if (value.includes('{')) {
      return interpolateEmbeddedAliases(
        tokensByName,
        value,
        mode,
        stack,
        fromName,
      )
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveTokenValue(tokensByName, item, mode, stack, fromName),
    )
  }
  if (isPlainObject(value)) {
    const resolved = {}
    for (const [key, child] of Object.entries(value)) {
      resolved[key] = resolveTokenValue(
        tokensByName,
        child,
        mode,
        stack,
        fromName,
      )
    }
    return resolved
  }
  throw new Error(
    `Unsupported $value for token "${fromName}": ${JSON.stringify(value)}`,
  )
}

function aliasTarget(authored) {
  return typeof authored === 'string' ? parseAlias(authored) : null
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

      if (document.overlayDensity) {
        const existing = tokensByName.get(entry.name)
        if (!existing) {
          throw new Error(
            `${document.file}: overlay token "${entry.name}" has no base token`,
          )
        }
        if (existing.tier !== 'semantic' || document.tier !== 'semantic') {
          throw new Error(
            `${document.file}: only semantic tokens may have density overlays`,
          )
        }
        if (entry.type !== existing.type) {
          throw new Error(
            `${document.file}: overlay token "${entry.name}" changes $type`,
          )
        }
        existing.densityAuthored = existing.densityAuthored ?? {}
        existing.densityAuthored[document.overlayDensity] = entry.authored
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
        highDpr: entry.highDpr,
        reducedMotion: entry.reducedMotion,
        touchMin: entry.touchMin,
        densityAuthored: undefined,
      })
    }
  }

  const tokens = [...tokensByName.values()]
    .map((token) => {
      const value = {
        light: serializeComposite(
          token.type,
          resolveAuthored(tokensByName, token.name, 'light', []),
        ),
        dark: serializeComposite(
          token.type,
          resolveAuthored(tokensByName, token.name, 'dark', []),
        ),
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
      if (token.highDpr) {
        compiled.highDpr = token.highDpr
      }
      if (token.reducedMotion) {
        compiled.reducedMotion = token.reducedMotion
      }
      if (token.touchMin) {
        compiled.touchMin = token.touchMin
      }
      if (token.densityAuthored) {
        const density = {}
        for (const [name, authored] of Object.entries(token.densityAuthored)) {
          density[name] = serializeComposite(
            token.type,
            resolveTokenValue(
              tokensByName,
              authored,
              'light',
              [`${token.name}:${name}`],
              token.name,
            ),
          )
        }
        compiled.density = density
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

function durationTokens(tokens) {
  return semanticTokens(tokens).filter((token) => token.type === 'duration')
}

export function usesRoundness(token) {
  if (token.tier !== 'semantic' || token.type !== 'dimension') return false
  if (token.name === ROUNDNESS_TOKEN_NAME) return false
  return (
    token.name.startsWith('radius.') ||
    token.name.endsWith('.radius') ||
    token.name.includes('.radius.')
  )
}

function roundnessTokens(tokens) {
  return semanticTokens(tokens).filter(usesRoundness)
}

function restSemanticTokens(tokens) {
  return semanticTokens(tokens).filter(
    (token) => token.type !== 'duration' && !usesRoundness(token),
  )
}

function densitySensitiveTokens(tokens) {
  return semanticTokens(tokens).filter((token) => token.density)
}

export function densityCssValue(token, density) {
  if (density === DEFAULT_DENSITY) return token.value.light
  return token.density?.[density] ?? token.value.light
}

const MOTION_INTENSITY_VAR = `${CSS_PREFIX}motion-intensity`

function cssRuntimeValue(token, value) {
  if (token.type === 'duration') {
    // Intensity is unitless 0–1 so consumers can scale every duration from any
    // subtree without rewriting each --sl-motion-duration-* property.
    return `calc(${value} * var(${MOTION_INTENSITY_VAR}, 1))`
  }
  if (usesRoundness(token)) {
    // Roundness is unitless 0–1 so a nested --sl-roundness re-evaluates every
    // radius without rewriting each property. 0 is sharp; 1 is the designed
    // radius (pill for radius.pill).
    return `calc(${value} * var(${ROUNDNESS_VAR}, 1))`
  }
  return value
}

export function dimensionToPx(value) {
  const match = String(value)
    .trim()
    .match(/^(-?[\d.]+)(px|rem)$/i)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null
  return match[2].toLowerCase() === 'rem' ? amount * 16 : amount
}

export function maxCssDimension(value, floor) {
  const valuePx = dimensionToPx(value)
  const floorPx = dimensionToPx(floor)
  if (valuePx == null || floorPx == null) {
    return `max(${value}, ${floor})`
  }
  return valuePx >= floorPx ? value : floor
}

function renderCustomProperties(tokens, mode, indent = '    ') {
  return tokens
    .map(
      (token) =>
        `${indent}${token.cssVar}: ${cssRuntimeValue(token, token.value[mode])};`,
    )
    .join('\n')
}

function withDescendants(selector) {
  // Duration calc() must be declared on descendants, not only the host.
  // Custom properties otherwise substitute --sl-motion-intensity on the host
  // and inherit a resolved time, so a nested intensity would do nothing.
  return `${selector}, ${selector} :where(*)`
}

export function forcedColorForToken(token) {
  if (token.tier !== 'semantic' || token.type !== 'color') return null
  const { name } = token
  if (name.startsWith('focus.ring')) {
    return name.endsWith('contrast') ? 'Canvas' : 'Highlight'
  }
  if (name.startsWith('action.')) {
    if (name.includes('.fg')) return 'ButtonText'
    if (name.includes('.border')) return 'ButtonText'
    if (name.includes('.bg')) return 'ButtonFace'
    return null
  }
  if (name === 'surface.inverse.bg') return 'CanvasText'
  if (name === 'surface.inverse.fg' || name === 'text.inverse') return 'Canvas'
  if (name === 'text.muted' || name === 'text.subtle') return 'GrayText'
  if (
    (name.startsWith('surface.') && name.includes('.bg')) ||
    (name.startsWith('status.') && name.includes('.bg')) ||
    (name.startsWith('elevation.') && name.includes('.bg')) ||
    (name.startsWith('material.') && name.includes('.bg'))
  ) {
    return 'Canvas'
  }
  if (name.startsWith('surface.fg') || name.startsWith('text.'))
    return 'CanvasText'
  if (
    name.startsWith('border.') ||
    name.startsWith('status.') ||
    (name.startsWith('elevation.') && name.includes('.border')) ||
    (name.startsWith('material.') && name.includes('.border'))
  ) {
    return 'CanvasText'
  }
  return 'CanvasText'
}

function renderForcedColors(tokens, indent = '    ') {
  return semanticTokens(tokens)
    .map((token) => {
      const systemColor = forcedColorForToken(token)
      if (!systemColor || !token.cssVar) return null
      return `${indent}${token.cssVar}: ${systemColor};`
    })
    .filter((line) => line !== null)
    .join('\n')
}

function renderHighDprProperties(tokens, indent = '    ') {
  return semanticTokens(tokens)
    .filter((token) => token.highDpr && token.cssVar)
    .map((token) => `${indent}${token.cssVar}: ${token.highDpr};`)
    .join('\n')
}

function renderReducedMotionProperties(tokens, indent = '    ') {
  return tokens
    .filter((token) => token.reducedMotion && token.cssVar)
    .map(
      (token) =>
        `${indent}${token.cssVar}: ${cssRuntimeValue(token, token.reducedMotion)};`,
    )
    .join('\n')
}

function densitySelector(density) {
  return `:where([${DENSITY_ATTRIBUTE}='${density}'])`
}

function renderDensityProperties(tokens, density, indent = '    ') {
  return tokens
    .map((token) => {
      const value = densityCssValue(token, density)
      return `${indent}${token.cssVar}: ${cssRuntimeValue(token, value)};`
    })
    .join('\n')
}

function renderDensityCss(tokens) {
  const sensitive = densitySensitiveTokens(tokens)
  if (sensitive.length === 0) return ''
  const rest = sensitive.filter((token) => !usesRoundness(token))
  const round = sensitive.filter(usesRoundness)
  return TOKEN_DENSITIES.map((density) => {
    const selector = densitySelector(density)
    const restVars = renderDensityProperties(rest, density)
    const roundVars = renderDensityProperties(round, density)
    const restBlock = restVars
      ? `
  ${selector} {
${restVars}
  }
`
      : ''
    const roundBlock = roundVars
      ? `
  ${withDescendants(selector)} {
${roundVars}
  }
`
      : ''
    return `${restBlock}${roundBlock}`
  }).join('')
}

function renderCoarsePointerCss(tokens) {
  const touchTokens = semanticTokens(tokens).filter(
    (token) => token.touchMin && token.cssVar,
  )
  if (touchTokens.length === 0) return ''

  const unsetHost = `${CSS_HOST}:not([${DENSITY_ATTRIBUTE}]):not(:where([${DENSITY_ATTRIBUTE}] *))`

  function floorBlock(density, indent = '    ') {
    return touchTokens
      .map((token) => {
        const value = densityCssValue(token, density)
        const floored = maxCssDimension(value, token.touchMin)
        return `${indent}${token.cssVar}: ${floored};`
      })
      .join('\n')
  }

  const unsetVars = floorBlock(DEFAULT_DENSITY, '      ')
  const densityBlocks = TOKEN_DENSITIES.map((density) => {
    const selector = densitySelector(density)
    return `
    ${selector} {
${floorBlock(density, '      ')}
    }
`
  }).join('')

  return `
  @media (pointer: coarse) {
    ${unsetHost} {
${unsetVars}
    }
${densityBlocks}  }
`
}

export function renderTokenCss(tokens) {
  const rest = restSemanticTokens(tokens)
  const durations = durationTokens(tokens)
  const radii = roundnessTokens(tokens)
  const lightVars = renderCustomProperties(rest, 'light')
  const darkVars = renderCustomProperties(rest, 'dark')
  const nestedDarkVars = renderCustomProperties(rest, 'dark', '      ')
  const lightDurations = renderCustomProperties(durations, 'light')
  const darkDurations = renderCustomProperties(durations, 'dark')
  const nestedDarkDurations = renderCustomProperties(
    durations,
    'dark',
    '      ',
  )
  const lightRadii = renderCustomProperties(radii, 'light')
  const darkRadii = renderCustomProperties(radii, 'dark')
  const nestedDarkRadii = renderCustomProperties(radii, 'dark', '      ')
  const densityBlock = renderDensityCss(tokens)
  const coarseBlock = renderCoarsePointerCss(tokens)
  const forcedVars = renderForcedColors(tokens)
  const highDprVars = renderHighDprProperties(tokens, '      ')
  const highDprBlock = highDprVars
    ? `
  @media (min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 2) {
    ${CSS_HOST} {
${highDprVars}
    }
  }
`
    : ''
  const descendantLight = [lightDurations, lightRadii]
    .filter(Boolean)
    .join('\n')
  const descendantDark = [darkDurations, darkRadii].filter(Boolean).join('\n')
  const nestedDescendantDark = [nestedDarkDurations, nestedDarkRadii]
    .filter(Boolean)
    .join('\n')
  const reducedRest = renderReducedMotionProperties(rest, '      ')
  const reducedDurations = renderReducedMotionProperties(durations, '      ')
  const reducedRadii = renderReducedMotionProperties(radii, '      ')
  const reducedRestBlock = reducedRest
    ? `
    ${CSS_HOST} {
${reducedRest}
    }
`
    : ''
  const reducedDescendant = [reducedDurations, reducedRadii]
    .filter(Boolean)
    .join('\n')
  const reducedDurationBlock = reducedDescendant
    ? `
    ${withDescendants(CSS_HOST)} {
${reducedDescendant}
    }
`
    : ''
  const reducedMotionBlock =
    reducedRest || reducedDescendant
      ? `
  @media (prefers-reduced-motion: reduce) {${reducedRestBlock}${reducedDurationBlock}  }
`
      : ''
  return `/*
 * Generated from packages/themes/tokens. Do not edit.
 * Semantic custom properties use --sl-<role>-<part>-<state>.
 * Unset data-sl-mode follows prefers-color-scheme; data-sl-mode overrides
 * on any subtree, including nested theme hosts. Unset data-sl-density is
 * comfortable; data-sl-density and --sl-roundness nest the same way.
 * No JavaScript is required to pick the initial mode, so SSR does not
 * flash the opposite palette.
 */
@layer slop-ui-theme {
  ${SYSTEM_HOST} {
${lightVars}
  }

  ${withDescendants(SYSTEM_HOST)} {
${descendantLight}
  }

  @media (prefers-color-scheme: dark) {
    ${SYSTEM_HOST} {
${nestedDarkVars}
    }

    ${withDescendants(SYSTEM_HOST)} {
${nestedDescendantDark}
    }
  }

  :where([data-sl-mode='light']) {
    color-scheme: light;
${lightVars}
  }

  ${withDescendants(":where([data-sl-mode='light'])")} {
${descendantLight}
  }

  :where([data-sl-mode='dark']) {
    color-scheme: dark;
${darkVars}
  }

  ${withDescendants(":where([data-sl-mode='dark'])")} {
${descendantDark}
  }

  :where(.slop-theme):not([data-sl-mode]):not(:where([data-sl-mode] *)) {
    color-scheme: light dark;
  }
${densityBlock}${coarseBlock}${highDprBlock}${reducedMotionBlock}
  @media (forced-colors: active) {
    ${CSS_HOST} {
${forcedVars}
    }
  }
}
`
}

function renderTokenObject(token) {
  const lines = [
    `    name: ${JSON.stringify(token.name)},`,
    token.cssVar ? `    cssVar: ${JSON.stringify(token.cssVar)},` : null,
    token.highDpr ? `    highDpr: ${JSON.stringify(token.highDpr)},` : null,
    token.reducedMotion
      ? `    reducedMotion: ${JSON.stringify(token.reducedMotion)},`
      : null,
    token.touchMin ? `    touchMin: ${JSON.stringify(token.touchMin)},` : null,
    token.density
      ? `    density: {\n${Object.entries(token.density)
          .map(([name, value]) => `      ${name}: ${JSON.stringify(value)},`)
          .join('\n')}\n    },`
      : null,
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
    densities: [...TOKEN_DENSITIES],
    defaultDensity: DEFAULT_DENSITY,
    attributes: {
      theme: THEME_ATTRIBUTE,
      mode: MODE_ATTRIBUTE,
      density: DENSITY_ATTRIBUTE,
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

function rampSwatchRow(tokensByName, hue, mode) {
  const spans = []
  for (const step of RAMP_STEPS) {
    const token = tokensByName.get(rampTokenName(hue, mode, step))
    if (!token) continue
    const hex = token.value.light
    spans.push(
      `<span title="${token.name} ${hex}" style="flex:1;background:${hex};border-radius:0.2rem"></span>`,
    )
  }
  if (spans.length === 0) return []
  const label = `${hue} (${mode}-tuned)`
  return [
    `### ${label}`,
    '',
    `<div role="img" aria-label="${label} ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;">${spans.join('')}</div>`,
    '',
  ]
}

export function renderTokenDocs(tokens) {
  const tokensByName = new Map(tokens.map((token) => [token.name, token]))
  const lines = [
    '<!-- Generated from packages/themes/tokens. Do not edit by hand. -->',
    '',
    '# Design token catalog',
    '',
    'Compiled from DTCG JSON in `@slop-ui/themes`. Semantic tokens are the',
    'public CSS custom properties (`--sl-<role>-<part>-<state>`). Primitive',
    'tokens are aliases for those values and are not published as CSS.',
    'Override a semantic custom property on any subtree; `data-sl-theme`,',
    '`data-sl-mode`, and `data-sl-density` nest. Unset `data-sl-mode` follows',
    '`prefers-color-scheme`. Unset `data-sl-density` is `comfortable`.',
    '`--sl-roundness` (0–1) scales every radius token from sharp to its',
    'designed value (pill for `radius.pill`).',
    '',
    'Default theme: `default`. Modes: `light`, `dark`. Densities: `compact`,',
    '`comfortable` (default), `spacious`.',
    '',
    'See [design tokens](../architecture/tokens.md) and',
    '[ADR 0007](../adr/0007-token-pipeline.md).',
    '',
    '## Color ramps',
    '',
    'Twelve-step OKLCH palettes generated from brand seeds. Light-tuned and',
    'dark-tuned ramps are independent; dark is not an inversion of light.',
    'These primitives are not CSS variables — components consume semantic',
    'tokens that alias them.',
    '',
  ]

  for (const hue of RAMP_HUES) {
    lines.push(...rampSwatchRow(tokensByName, hue, 'light'))
    lines.push(...rampSwatchRow(tokensByName, hue, 'dark'))
  }

  lines.push('## Semantic tokens', '')

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
    'Primitives are not CSS variables. Color ramps live here so semantic',
    'tokens can alias a stable OKLCH scale.',
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
      overlayDensity: source.overlayDensity,
      tree,
    })
  }
  return documents
}

async function loadRampDocument(tokensDir) {
  const seedsPath = join(tokensDir, 'seeds.json')
  try {
    const seeds = JSON.parse(await readFile(seedsPath, 'utf8'))
    return {
      file: 'generated/ramps.json',
      tier: 'primitive',
      tree: generateRampDocument(seeds),
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null
    }
    throw error
  }
}

export async function compileThemeTokens(tokensDir) {
  const rampDocument = await loadRampDocument(tokensDir)
  const documents = [
    ...(rampDocument ? [rampDocument] : []),
    ...(await loadTokenDocuments(tokensDir)),
  ]
  const compiled = compileTokenDocuments(documents)
  return {
    ...compiled,
    rampsJson: rampDocument ? serializeJson(rampDocument.tree) : null,
    manifestJson: serializeJson(compiled.manifest),
  }
}

export function themeTokenOutputPaths(packageRoot, docsPath) {
  return {
    ramps: join(packageRoot, 'tokens/generated/ramps.json'),
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
  await mkdir(dirname(paths.ramps), { recursive: true })
  await mkdir(dirname(paths.docs), { recursive: true })
  if (compiled.rampsJson) {
    await writeFile(paths.ramps, compiled.rampsJson)
  }
  await writeFile(paths.css, compiled.css)
  await writeFile(paths.typescript, compiled.typescript)
  await writeFile(paths.manifest, compiled.manifestJson)
  await writeFile(paths.docs, compiled.docsMarkdown)
  return { compiled, paths }
}
