/**
 * Node-only brand theme generator (ADR 0008). Builds a complete token sheet
 * from a small input, reusing the DTCG compile pipeline. Not imported from
 * the browser entry — culori stays a themes devDependency.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { clampChroma, converter, formatHex, parse, wcagContrast } from 'culori'

import {
  compileTokenDocuments,
  DEFAULT_DENSITY,
  DEFAULT_THEME_NAME,
  renderTokenCss,
  TOKEN_DENSITIES,
} from './compile-tokens.js'
import {
  evaluateContrast,
  isHexColor,
  WCAG_AA_NORMAL_TEXT,
} from './contrast.js'
import {
  generateRampDocument,
  RAMP_HUES,
  RAMP_STEPS,
} from './generate-ramps.js'

const toOklch = converter('oklch')

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const MAX_NAME_LENGTH = 64
const ELEVATION_FLAVORS = ['subtle', 'standard', 'dramatic']
const GRADIENT_FLAVORS = ['none', 'subtle', 'aurora']
const INTERACTIVITY_FLAVORS = ['none', 'subtle', 'expressive']
const RELATIVE_COLOR = /\bfrom\b/i
const KEYWORD_COLORS = new Set([
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'transparent',
])

const tokensDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../tokens',
)

const seedsTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'seeds.json'), 'utf8'),
)
const primitivesTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'primitives.json'), 'utf8'),
)
const semanticTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'semantic.json'), 'utf8'),
)
const semanticDarkTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'semantic.dark.json'), 'utf8'),
)
const semanticCompactTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'semantic.compact.json'), 'utf8'),
)
const semanticSpaciousTemplate = JSON.parse(
  readFileSync(resolve(tokensDir, 'semantic.spacious.json'), 'utf8'),
)

export const flagshipThemes = ['calm', 'vibrant', 'mono']

/** Signed-off flagship knobs from ADR 0008. */
export const FLAGSHIP_THEME_INPUTS = [
  {
    name: 'calm',
    primary: 215,
    neutralTint: 215,
    roundness: 0.3,
    density: 'compact',
    motionIntensity: 0.6,
    elevation: 'subtle',
    gradient: 'none',
    interactivity: 'subtle',
  },
  {
    name: 'vibrant',
    primary: 292,
    neutralTint: 280,
    roundness: 1,
    density: 'comfortable',
    motionIntensity: 1,
    elevation: 'dramatic',
    gradient: 'aurora',
    interactivity: 'expressive',
  },
  {
    name: 'mono',
    primary: '#171717',
    neutralTint: 'none',
    roundness: 0,
    density: 'comfortable',
    motionIntensity: 0.45,
    elevation: 'subtle',
    gradient: 'none',
    interactivity: 'subtle',
  },
]

export class DefineThemeError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DefineThemeError'
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHue(value) {
  return value === 360 ? 0 : value
}

function assertFiniteRange(name, value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DefineThemeError(`${name} must be a finite number`)
  }
  if (value < min || value > max) {
    throw new DefineThemeError(`${name} must be between ${min} and ${max}`)
  }
}

function parseAbsoluteColor(raw, label) {
  const trimmed = raw.trim()
  if (trimmed === '') {
    throw new DefineThemeError(`${label} must be a non-empty CSS color`)
  }
  if (
    KEYWORD_COLORS.has(trimmed.toLowerCase()) ||
    RELATIVE_COLOR.test(trimmed)
  ) {
    throw new DefineThemeError(
      `${label} must be an absolute color (hex, rgb, hsl, or oklch), not "${raw}"`,
    )
  }
  const parsed = parse(trimmed)
  if (!parsed) {
    throw new DefineThemeError(
      `${label} is not a parseable CSS color: "${raw}"`,
    )
  }
  const hex = formatHex(parsed)
  if (!hex) {
    throw new DefineThemeError(`${label} cannot be serialized to sRGB`)
  }
  return hex
}

function oklchOfHex(hex) {
  const color = toOklch(hex)
  if (!color || typeof color.l !== 'number') {
    throw new DefineThemeError(`Cannot read OKLCH from "${hex}"`)
  }
  return { l: color.l, c: color.c ?? 0, h: color.h ?? 0 }
}

function hexFromOklch(l, c, h) {
  const fitted = clampChroma(
    { mode: 'oklch', l, c: Math.max(0, c), h },
    'oklch',
  )
  const hex = formatHex(fitted)
  if (!hex) {
    throw new DefineThemeError('Cannot serialize OKLCH seed')
  }
  return hex
}

function templateSeed(mode, hue) {
  const spec = seedsTemplate.modes[mode]?.[hue]
  if (!isPlainObject(spec) || typeof spec.hex !== 'string') {
    throw new DefineThemeError(`Missing default seed for ${mode}.${hue}`)
  }
  return spec
}

/**
 * Hue-only seeds keep the library's role lightness/chroma so a number is a
 * brand hue, not a washed-out default. Color strings become the light seed
 * and donate hue/chroma to the independently-tuned dark template lightness.
 */
function resolveSeedHex(seed, hue, mode) {
  const template = oklchOfHex(templateSeed(mode, hue).hex)
  if (seed === 'none') {
    return hexFromOklch(template.l, 0, 0)
  }
  if (typeof seed === 'number') {
    return hexFromOklch(template.l, template.c, normalizeHue(seed))
  }
  const hex = parseAbsoluteColor(seed, `${hue} seed`)
  if (mode === 'light') return hex
  const parsed = oklchOfHex(hex)
  return hexFromOklch(template.l, parsed.c, parsed.h)
}

function resolveColorSeed(seed, label) {
  if (typeof seed === 'number') {
    assertFiniteRange(label, seed, 0, 360)
    return { kind: 'hue', hue: normalizeHue(seed) }
  }
  if (typeof seed === 'string') {
    parseAbsoluteColor(seed, label)
    return { kind: 'color', color: seed }
  }
  throw new DefineThemeError(
    `${label} must be a hue number or CSS color string`,
  )
}

function validateInput(input) {
  if (!isPlainObject(input)) {
    throw new DefineThemeError('defineTheme input must be an object')
  }
  const { name, primary } = input
  if (
    typeof name !== 'string' ||
    !NAME_PATTERN.test(name) ||
    name.length > MAX_NAME_LENGTH
  ) {
    throw new DefineThemeError(
      `name must be kebab-case, length 1–${MAX_NAME_LENGTH}`,
    )
  }
  if (name === DEFAULT_THEME_NAME) {
    throw new DefineThemeError(
      `name "${DEFAULT_THEME_NAME}" is reserved for authored DTCG`,
    )
  }
  if (primary === undefined) {
    throw new DefineThemeError('primary is required')
  }
  resolveColorSeed(primary, 'primary')
  if (input.neutralTint !== undefined && input.neutralTint !== 'none') {
    resolveColorSeed(input.neutralTint, 'neutralTint')
  }
  if (input.status !== undefined) {
    if (!isPlainObject(input.status)) {
      throw new DefineThemeError('status must be an object')
    }
    for (const hue of ['success', 'warning', 'danger', 'info']) {
      if (input.status[hue] !== undefined) {
        resolveColorSeed(input.status[hue], `status.${hue}`)
      }
    }
  }
  if (input.roundness !== undefined) {
    assertFiniteRange('roundness', input.roundness, 0, 1)
  }
  if (input.motionIntensity !== undefined) {
    assertFiniteRange('motionIntensity', input.motionIntensity, 0, 1)
  }
  if (input.density !== undefined && !TOKEN_DENSITIES.includes(input.density)) {
    throw new DefineThemeError(
      `density must be one of ${TOKEN_DENSITIES.join(', ')}`,
    )
  }
  if (
    input.elevation !== undefined &&
    !ELEVATION_FLAVORS.includes(input.elevation)
  ) {
    throw new DefineThemeError(
      `elevation must be one of ${ELEVATION_FLAVORS.join(', ')}`,
    )
  }
  if (
    input.gradient !== undefined &&
    !GRADIENT_FLAVORS.includes(input.gradient)
  ) {
    throw new DefineThemeError(
      `gradient must be one of ${GRADIENT_FLAVORS.join(', ')}`,
    )
  }
  if (
    input.interactivity !== undefined &&
    !INTERACTIVITY_FLAVORS.includes(input.interactivity)
  ) {
    throw new DefineThemeError(
      `interactivity must be one of ${INTERACTIVITY_FLAVORS.join(', ')}`,
    )
  }
}

function seedValue(resolved, hueName, mode) {
  if (resolved === undefined) {
    return templateSeed(mode, hueName).hex
  }
  if (resolved === 'none') {
    return resolveSeedHex('none', hueName, mode)
  }
  if (resolved.kind === 'hue') {
    return resolveSeedHex(resolved.hue, hueName, mode)
  }
  return resolveSeedHex(resolved.color, hueName, mode)
}

function buildSeeds(input) {
  const primary = resolveColorSeed(input.primary, 'primary')
  const primaryHue =
    primary.kind === 'hue'
      ? primary.hue
      : oklchOfHex(parseAbsoluteColor(input.primary, 'primary')).h
  const neutral =
    input.neutralTint === undefined
      ? { kind: 'hue', hue: primaryHue }
      : input.neutralTint === 'none'
        ? 'none'
        : resolveColorSeed(input.neutralTint, 'neutralTint')

  const status = input.status ?? {}
  const seeds = clone(seedsTemplate)
  for (const mode of ['light', 'dark']) {
    seeds.modes[mode].primary = {
      hex: seedValue(primary, 'primary', mode),
      anchor: templateSeed(mode, 'primary').anchor,
    }
    seeds.modes[mode].neutral = {
      hex: seedValue(neutral, 'neutral', mode),
      anchor: templateSeed(mode, 'neutral').anchor,
    }
    for (const hue of ['success', 'warning', 'danger', 'info']) {
      const override =
        status[hue] === undefined
          ? undefined
          : resolveColorSeed(status[hue], `status.${hue}`)
      seeds.modes[mode][hue] = {
        hex: seedValue(override, hue, mode),
        anchor: templateSeed(mode, hue).anchor,
      }
    }
  }
  return seeds
}

function setTokenValue(tree, path, value) {
  const parts = path.split('.')
  let node = tree
  for (const part of parts) {
    if (!isPlainObject(node[part])) {
      return false
    }
    node = node[part]
  }
  if (!Object.hasOwn(node, '$value')) {
    return false
  }
  node.$value = value
  return true
}

function scaleCssDimension(value, factor) {
  if (typeof value !== 'string') return value
  const match = value.trim().match(/^(-?[\d.]+)(px|rem)$/i)
  if (!match) return value
  const next = Number(match[1]) * factor
  if (!Number.isFinite(next)) return value
  const rounded = Math.round(next * 1000) / 1000
  return `${rounded}${match[2]}`
}

function scaleShadowValue(value, factor) {
  // Alias strings stay aliases; scaling a wrapped string would fail compile.
  if (typeof value === 'string') return value
  const layers = Array.isArray(value) ? value : [value]
  return layers.map((layer) => {
    if (!isPlainObject(layer)) return layer
    return {
      ...layer,
      offsetY: scaleCssDimension(layer.offsetY, factor),
      blur: scaleCssDimension(layer.blur, factor),
      spread:
        layer.spread == null || layer.spread === ''
          ? layer.spread
          : scaleCssDimension(layer.spread, factor),
    }
  })
}

function walkTokens(node, visit) {
  if (!isPlainObject(node)) return
  if (Object.hasOwn(node, '$value')) {
    visit(node)
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    walkTokens(child, visit)
  }
}

function retintOklchString(value, hue) {
  if (typeof value !== 'string') return value
  return value.replace(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+[\d.]+\s*(\/[\s\d.]+)?\)/g,
    (_all, l, c, alpha) => `oklch(${l} ${c} ${hue}${alpha ?? ''})`,
  )
}

function applyInteractivityFlavor(tree, flavor) {
  // Authored semantic.json is the subtle recipe; skip a rewrite.
  if (flavor === 'subtle') return
  if (flavor === 'none') {
    setTokenValue(tree, 'interactive.spotlight.size', '0px')
    setTokenValue(tree, 'interactive.spotlight.opacity', 0)
    return
  }
  setTokenValue(tree, 'interactive.spotlight.size', '20rem')
  setTokenValue(tree, 'interactive.spotlight.opacity', 0.75)
}

function applyElevationFlavor(tree, flavor) {
  const factor = flavor === 'subtle' ? 0.5 : flavor === 'dramatic' ? 1.65 : 1
  if (factor === 1) return
  walkTokens(tree, (node) => {
    if (node.$type === 'shadow') {
      node.$value = scaleShadowValue(node.$value, factor)
    }
  })
}

function solidGradient(colorRef) {
  return {
    style: 'linear',
    interpolation: 'oklch',
    angle: '135deg',
    stops: [
      { color: colorRef, position: 0 },
      { color: colorRef, position: 1 },
    ],
  }
}

function applyGradientFlavor(tree, flavor, mode = 'light') {
  if (flavor === 'subtle') return
  const primaryRef =
    mode === 'dark' ? '{color.primary.dark.400}' : '{color.primary.700}'
  const primarySoft =
    mode === 'dark' ? '{color.primary.dark.600}' : '{color.primary.300}'
  const infoSoft =
    mode === 'dark' ? '{color.info.dark.600}' : '{color.info.300}'
  const dangerSoft =
    mode === 'dark' ? '{color.danger.dark.700}' : '{color.danger.200}'
  const primaryMid =
    mode === 'dark' ? '{color.primary.dark.400}' : '{color.primary.500}'

  if (flavor === 'none') {
    setTokenValue(tree, 'gradient.accent', solidGradient(primaryRef))
    setTokenValue(tree, 'gradient.aurora', solidGradient('{surface.bg}'))
    setTokenValue(tree, 'gradient.border', '{gradient.accent}')
    setTokenValue(
      tree,
      'gradient.action.primary',
      solidGradient('{action.primary.bg}'),
    )
    setTokenValue(
      tree,
      'gradient.action.neutral',
      solidGradient('{action.neutral.bg}'),
    )
    setTokenValue(
      tree,
      'gradient.action.danger',
      solidGradient('{action.danger.bg}'),
    )
    return
  }

  const primaryHot =
    mode === 'dark' ? '{color.primary.dark.300}' : '{color.primary.400}'
  const infoHot = mode === 'dark' ? '{color.info.dark.300}' : '{color.info.400}'
  const dangerHot =
    mode === 'dark' ? '{color.danger.dark.300}' : '{color.danger.400}'

  setTokenValue(tree, 'gradient.accent', {
    style: 'linear',
    interpolation: 'oklch',
    angle: '118deg',
    stops: [
      { color: primaryHot, position: 0 },
      { color: infoHot, position: 0.42 },
      { color: dangerHot, position: 1 },
    ],
  })
  // Four overlapping wells so aurora reads as light in space, not a pastel wash.
  setTokenValue(tree, 'gradient.aurora', [
    {
      style: 'radial',
      interpolation: 'oklch',
      at: '8% 12%',
      stops: [
        { color: primaryHot, position: 0 },
        { color: primarySoft, position: 0.28 },
        { color: 'transparent', position: 0.72 },
      ],
    },
    {
      style: 'radial',
      interpolation: 'oklch',
      at: '92% 6%',
      stops: [
        { color: infoHot, position: 0 },
        { color: infoSoft, position: 0.32 },
        { color: 'transparent', position: 0.68 },
      ],
    },
    {
      style: 'radial',
      interpolation: 'oklch',
      at: '78% 88%',
      stops: [
        { color: dangerHot, position: 0 },
        { color: dangerSoft, position: 0.3 },
        { color: 'transparent', position: 0.7 },
      ],
    },
    {
      style: 'radial',
      interpolation: 'oklch',
      at: '42% 48%',
      stops: [
        { color: primaryMid, position: 0 },
        { color: 'transparent', position: 0.62 },
      ],
    },
  ])
}

function pinActionGradientStops(tree, mode = 'light') {
  // Keep action gradient ends in-hue so a single on-color can meet AA against
  // every paired stop. Decorative gradient.accent may still shift hues.
  const suffix = mode === 'dark' ? '.dark' : ''
  const fromStep = mode === 'dark' ? '400' : '700'
  const toStep = mode === 'dark' ? '300' : '800'
  for (const hue of ['primary', 'neutral', 'danger']) {
    setTokenValue(
      tree,
      `action.${hue}.gradient.from`,
      `{color.${hue}${suffix}.${fromStep}}`,
    )
    setTokenValue(
      tree,
      `action.${hue}.gradient.to`,
      `{color.${hue}${suffix}.${toStep}}`,
    )
  }
}

function applyPrimitiveTint(primitives, seeds) {
  const lightHue = oklchOfHex(seeds.modes.light.neutral.hex).h
  walkTokens(primitives, (node) => {
    if (node.$type === 'color' && typeof node.$value === 'string') {
      node.$value = retintOklchString(node.$value, lightHue)
    }
  })
}

function relatedHue(tokenName) {
  for (const hue of RAMP_HUES) {
    if (tokenName.includes(`.${hue}.`) || tokenName.endsWith(`.${hue}`)) {
      return hue
    }
  }
  return 'neutral'
}

function tokenHex(tokensByName, name) {
  const token = tokensByName.get(name)
  if (!token) return undefined
  const value = token.value.light
  return isHexColor(value) ? value : undefined
}

function rampCandidates(tokensByName, hue, mode) {
  const hexes = []
  for (const step of RAMP_STEPS) {
    const name =
      mode === 'dark' ? `color.${hue}.dark.${step}` : `color.${hue}.${step}`
    const hex = tokenHex(tokensByName, name)
    if (hex) hexes.push(hex)
  }
  return hexes
}

function candidateForegrounds(tokensByName, fgName, mode) {
  const ordered = []
  const seen = new Set()
  const add = (hex) => {
    if (!hex || seen.has(hex)) return
    seen.add(hex)
    ordered.push(hex)
  }
  add(tokenHex(tokensByName, 'color.white'))
  add(tokenHex(tokensByName, 'color.ink'))
  add(tokenHex(tokensByName, 'color.mist'))
  const hue = relatedHue(fgName)
  for (const hex of rampCandidates(tokensByName, hue, mode)) add(hex)
  if (hue !== 'neutral') {
    for (const hex of rampCandidates(tokensByName, 'neutral', mode)) add(hex)
  }
  return ordered
}

function rampStepsForHue(tokensByName, hue, mode) {
  const steps = []
  for (const step of RAMP_STEPS) {
    const name =
      mode === 'dark' ? `color.${hue}.dark.${step}` : `color.${hue}.${step}`
    const hex = tokenHex(tokensByName, name)
    if (hex) steps.push({ step, hex })
  }
  return steps
}

function setTokenModeValue(tokensByName, name, mode, hex) {
  const token = tokensByName.get(name)
  if (token && isHexColor(hex)) {
    token.value[mode] = hex
  }
}

/**
 * Prefer a white (light) or ink (dark) label by walking action fills toward
 * a ramp step that already meets AA, instead of inventing an on-color that
 * cannot contrast with both a light rest fill and a dark press fill.
 */
export function ensureReadableActionFills(tokens) {
  const tokensByName = new Map(tokens.map((token) => [token.name, token]))
  const white = tokenHex(tokensByName, 'color.white')
  const ink = tokenHex(tokensByName, 'color.ink')
  const mist = tokenHex(tokensByName, 'color.mist')

  for (const hue of [
    'primary',
    'neutral',
    'success',
    'warning',
    'danger',
    'info',
  ]) {
    const stem = `action.${hue}`
    if (!tokensByName.has(`${stem}.bg`) || !tokensByName.has(`${stem}.fg`)) {
      continue
    }
    const steps = {
      light: rampStepsForHue(tokensByName, hue, 'light'),
      dark: rampStepsForHue(tokensByName, hue, 'dark'),
    }
    for (const mode of ['light', 'dark']) {
      const fgPreference = mode === 'light' ? [white, ink] : [ink, mist, white]
      const ramp = steps[mode]
      if (ramp.length === 0) continue
      const start = ramp.findIndex(
        (entry) => entry.step === (mode === 'light' ? 700 : 400),
      )
      const from = start === -1 ? Math.floor(ramp.length / 2) : start
      let chosenFg = null
      let restIndex = -1
      for (const fg of fgPreference) {
        if (!fg) continue
        const direction = mode === 'light' ? 1 : -1
        for (
          let index = from;
          index >= 0 && index < ramp.length;
          index += direction
        ) {
          if (wcagContrast(fg, ramp[index].hex) >= WCAG_AA_NORMAL_TEXT) {
            chosenFg = fg
            restIndex = index
            break
          }
        }
        if (chosenFg) break
      }
      if (!chosenFg || restIndex === -1) continue
      const hoverIndex = Math.min(
        ramp.length - 1,
        Math.max(0, restIndex + (mode === 'light' ? 1 : -1)),
      )
      const activeIndex = Math.min(
        ramp.length - 1,
        Math.max(0, restIndex + (mode === 'light' ? 2 : -2)),
      )
      setTokenModeValue(tokensByName, `${stem}.fg`, mode, chosenFg)
      setTokenModeValue(tokensByName, `${stem}.bg`, mode, ramp[restIndex].hex)
      setTokenModeValue(
        tokensByName,
        `${stem}.bg.hover`,
        mode,
        ramp[hoverIndex].hex,
      )
      setTokenModeValue(
        tokensByName,
        `${stem}.bg.active`,
        mode,
        ramp[activeIndex].hex,
      )
      setTokenModeValue(
        tokensByName,
        `${stem}.gradient.from`,
        mode,
        ramp[restIndex].hex,
      )
      setTokenModeValue(
        tokensByName,
        `${stem}.gradient.to`,
        mode,
        ramp[hoverIndex].hex,
      )
      setTokenModeValue(
        tokensByName,
        `${stem}.border`,
        mode,
        ramp[restIndex].hex,
      )
    }
  }
}

/**
 * Walks white/ink and related ramps to pick an on-color that meets WCAG AA
 * against every paired background in that mode. Does not mutate the caller's
 * primary seed. Throws when no candidate works.
 */
export function applyContrastAdjustments(tokens) {
  const tokensByName = new Map(tokens.map((token) => [token.name, token]))
  const results = evaluateContrast(tokens)
  const failingKeys = new Set(
    results
      .filter((row) => !row.passesWcagAa)
      .map((row) => `${row.fg}:${row.mode}`),
  )
  const groups = new Map()
  for (const row of results) {
    const key = `${row.fg}:${row.mode}`
    if (!failingKeys.has(key)) continue
    const group = groups.get(key) ?? {
      fg: row.fg,
      mode: row.mode,
      backgrounds: [],
    }
    group.backgrounds.push(row.bgValue)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    const fgToken = tokensByName.get(group.fg)
    if (!fgToken) {
      throw new DefineThemeError(`Cannot adjust missing foreground ${group.fg}`)
    }
    const backgrounds = group.backgrounds.filter(isHexColor)
    const candidates = candidateForegrounds(tokensByName, group.fg, group.mode)
    let best = null
    let bestScore = -1
    for (const candidate of candidates) {
      const score = Math.min(
        ...backgrounds.map((bg) => wcagContrast(candidate, bg)),
      )
      if (score >= WCAG_AA_NORMAL_TEXT && score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
    if (!best) {
      throw new DefineThemeError(
        `Cannot satisfy WCAG AA for ${group.fg} in ${group.mode} against ${backgrounds.join(', ')}`,
      )
    }
    fgToken.value[group.mode] = best
  }

  const remaining = evaluateContrast(tokens).filter((row) => !row.passesWcagAa)
  if (remaining.length > 0) {
    const summary = remaining
      .map((row) => `${row.fg} on ${row.bg} (${row.mode})`)
      .join('; ')
    throw new DefineThemeError(
      `Theme contrast still fails WCAG AA after fg auto-adjust: ${summary}`,
    )
  }
  return tokens
}

/**
 * Compile a complete theme from brand knobs. Node-only; returns CSS scoped to
 * `[data-sl-theme='name']`.
 *
 * @param {object} input
 */
export function defineTheme(input) {
  validateInput(input)
  const roundness = input.roundness ?? 1
  const density = input.density ?? DEFAULT_DENSITY
  const motionIntensity = input.motionIntensity ?? 1
  const elevation = input.elevation ?? 'standard'
  const gradient = input.gradient ?? 'subtle'
  const interactivity = input.interactivity ?? 'subtle'

  const seeds = buildSeeds(input)
  const primitives = clone(primitivesTemplate)
  const semantic = clone(semanticTemplate)
  const semanticDark = clone(semanticDarkTemplate)
  applyPrimitiveTint(primitives, seeds)
  setTokenValue(semantic, 'roundness.amount', roundness)
  setTokenValue(semantic, 'motion.intensity', motionIntensity)
  applyElevationFlavor(semantic, elevation)
  applyElevationFlavor(semanticDark, elevation)
  pinActionGradientStops(semantic, 'light')
  pinActionGradientStops(semanticDark, 'dark')
  applyGradientFlavor(semantic, gradient, 'light')
  applyGradientFlavor(semanticDark, gradient, 'dark')
  applyInteractivityFlavor(semantic, interactivity)
  applyInteractivityFlavor(semanticDark, interactivity)

  const compiled = compileTokenDocuments(
    [
      {
        file: 'generated/ramps.json',
        tier: 'primitive',
        tree: generateRampDocument(seeds),
      },
      { file: 'primitives.json', tier: 'primitive', tree: primitives },
      { file: 'semantic.json', tier: 'semantic', tree: semantic },
      {
        file: 'semantic.dark.json',
        tier: 'semantic',
        overlayMode: 'dark',
        tree: semanticDark,
      },
      {
        file: 'semantic.compact.json',
        tier: 'semantic',
        overlayDensity: 'compact',
        tree: clone(semanticCompactTemplate),
      },
      {
        file: 'semantic.spacious.json',
        tier: 'semantic',
        overlayDensity: 'spacious',
        tree: clone(semanticSpaciousTemplate),
      },
    ],
    { themeName: input.name, defaultDensity: density },
  )

  ensureReadableActionFills(compiled.tokens)
  applyContrastAdjustments(compiled.tokens)
  compiled.css = renderTokenCss(compiled.tokens, {
    themeName: input.name,
    defaultDensity: density,
  })
  compiled.manifest.theme = input.name
  compiled.manifest.defaultDensity = density

  return {
    name: input.name,
    css: compiled.css,
    tokens: compiled.tokens,
    manifest: compiled.manifest,
  }
}
