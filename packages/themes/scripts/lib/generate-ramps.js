/**
 * Build 12-step OKLCH ramps from brand seeds. Light and dark each have
 * their own lightness/chroma curves so dark is not `1 - light`.
 *
 * The seed is pinned at its anchor step so SlButton rest colors stay
 * the hex values the theme already shipped.
 */
import { clampChroma, converter, formatHex } from 'culori'

const toOklch = converter('oklch')

export const RAMP_HUES = [
  'neutral',
  'primary',
  'success',
  'warning',
  'danger',
  'info',
]
export const RAMP_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000,
]
export const RAMP_MODES = ['light', 'dark']

/**
 * Shared lightness scaffolds (OKLCH L, 0–1). Dark is lifted at the
 * bottom and less blown-out at the top so mid-chroma accents sit on a
 * dark canvas without flipping the light ramp.
 */
export const LIGHTNESS_CURVES = {
  light: [
    0.985, 0.955, 0.91, 0.84, 0.74, 0.64, 0.54, 0.45, 0.37, 0.29, 0.22, 0.15,
  ],
  dark: [0.96, 0.9, 0.82, 0.74, 0.67, 0.58, 0.49, 0.41, 0.34, 0.27, 0.21, 0.16],
}

/** Chroma as a fraction of the seed. Dark peaks nearer the light end. */
export const CHROMA_CURVES = {
  light: [0.08, 0.16, 0.32, 0.52, 0.72, 0.88, 0.98, 1, 0.9, 0.72, 0.52, 0.38],
  dark: [0.22, 0.4, 0.62, 0.88, 1.05, 1, 0.88, 0.72, 0.55, 0.4, 0.28, 0.2],
}

function normalizeHex(hex) {
  const formatted = formatHex(hex)
  if (!formatted) {
    throw new Error(`Cannot serialize color "${hex}"`)
  }
  return formatted
}

function fitLightnessToAnchor(curve, anchorIndex, seedL) {
  const start = curve[0]
  const end = curve[curve.length - 1]
  const anchorTemplate = curve[anchorIndex]
  return curve.map((value, index) => {
    if (index === anchorIndex) return clampUnit(seedL)
    if (index < anchorIndex) {
      const span = anchorTemplate - start
      const t = span === 0 ? index / anchorIndex : (value - start) / span
      return clampUnit(start + t * (seedL - start))
    }
    const span = end - anchorTemplate
    const t = span === 0 ? 0 : (value - anchorTemplate) / span
    return clampUnit(seedL + t * (end - seedL))
  })
}

function clampUnit(value) {
  return Math.min(0.99, Math.max(0.05, value))
}

/**
 * @param {string} seedHex
 * @param {{ mode: 'light' | 'dark', anchor: number, hueShift?: number }} options
 * @returns {Record<string, string>}
 */
export function generateHueRamp(seedHex, options) {
  const { mode, anchor, hueShift = 0 } = options
  const seed = toOklch(seedHex)
  if (!seed || typeof seed.l !== 'number') {
    throw new Error(`Cannot parse seed color "${seedHex}"`)
  }

  const anchorIndex = RAMP_STEPS.indexOf(anchor)
  if (anchorIndex === -1) {
    throw new Error(`Unknown ramp anchor step ${anchor}`)
  }

  const lightness = fitLightnessToAnchor(
    LIGHTNESS_CURVES[mode],
    anchorIndex,
    seed.l,
  )
  const chromaScale = CHROMA_CURVES[mode]
  const seedChroma = seed.c ?? 0
  const seedHue = seed.h ?? 0
  const lastIndex = RAMP_STEPS.length - 1

  /** @type {Record<string, string>} */
  const ramp = {}
  for (const [index, step] of RAMP_STEPS.entries()) {
    const shiftedHue = seedHue + hueShift * (index / lastIndex)
    const candidate = clampChroma(
      {
        mode: 'oklch',
        l: lightness[index],
        c: Math.max(0, seedChroma * chromaScale[index]),
        h: shiftedHue,
      },
      'oklch',
    )
    ramp[String(step)] = normalizeHex(candidate)
  }
  ramp[String(anchor)] = normalizeHex(seedHex)
  return ramp
}

function hueDescription(hue, step, mode) {
  const tuned = mode === 'dark' ? 'dark-tuned' : 'light-tuned'
  return `${capitalize(hue)} ${step} (${tuned}).`
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * @param {unknown} seeds
 * @returns {Record<string, unknown>}
 */
export function generateRampDocument(seeds) {
  if (!isPlainObject(seeds) || !isPlainObject(seeds.modes)) {
    throw new Error('seeds.json must contain a modes object')
  }

  const hues = Array.isArray(seeds.hues) ? seeds.hues : RAMP_HUES
  const steps = Array.isArray(seeds.steps) ? seeds.steps : RAMP_STEPS
  if (steps.join() !== RAMP_STEPS.join()) {
    throw new Error(
      `seeds.json steps must be the 12-step scale ${RAMP_STEPS.join(', ')}`,
    )
  }

  /** @type {Record<string, unknown>} */
  const color = {}
  for (const hue of hues) {
    if (!RAMP_HUES.includes(hue)) {
      throw new Error(`Unknown ramp hue "${hue}"`)
    }
    /** @type {Record<string, unknown>} */
    const hueGroup = {}
    for (const mode of RAMP_MODES) {
      const spec = seeds.modes[mode]?.[hue]
      if (!isPlainObject(spec) || typeof spec.hex !== 'string') {
        throw new Error(`seeds.json is missing ${mode}.${hue}.hex`)
      }
      if (typeof spec.anchor !== 'number') {
        throw new Error(`seeds.json is missing ${mode}.${hue}.anchor`)
      }
      const ramp = generateHueRamp(spec.hex, {
        mode,
        anchor: spec.anchor,
        hueShift: typeof spec.hueShift === 'number' ? spec.hueShift : 0,
      })
      if (mode === 'light') {
        for (const step of RAMP_STEPS) {
          hueGroup[String(step)] = {
            $type: 'color',
            $value: ramp[String(step)],
            $description: hueDescription(hue, step, 'light'),
          }
        }
      } else {
        /** @type {Record<string, unknown>} */
        const darkGroup = {}
        for (const step of RAMP_STEPS) {
          darkGroup[String(step)] = {
            $type: 'color',
            $value: ramp[String(step)],
            $description: hueDescription(hue, step, 'dark'),
          }
        }
        hueGroup.dark = darkGroup
      }
    }
    color[hue] = hueGroup
  }

  return { color }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function rampTokenName(hue, mode, step) {
  return mode === 'dark' ? `color.${hue}.dark.${step}` : `color.${hue}.${step}`
}

/** Test helper: OKLCH channels for a generated hex, resolved via culori. */
export function oklchOf(hex) {
  const color = toOklch(hex)
  if (!color || typeof color.l !== 'number') {
    throw new Error(`Cannot read OKLCH from "${hex}"`)
  }
  return { l: color.l, c: color.c ?? 0, h: color.h ?? 0 }
}
