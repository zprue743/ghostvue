/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  RAMP_HUES,
  RAMP_STEPS,
  generateHueRamp,
  generateRampDocument,
  oklchOf,
} from '../../packages/themes/scripts/lib/generate-ramps.js'
const seedsPath = resolve(process.cwd(), 'packages/themes/tokens/seeds.json')

describe('OKLCH ramp generation', () => {
  it('emits 12 steps and pins the seed at the anchor', () => {
    const ramp = generateHueRamp('#1d4ed8', { mode: 'light', anchor: 700 })
    expect(Object.keys(ramp).map(Number)).toEqual([...RAMP_STEPS])
    expect(ramp['700']).toBe('#1d4ed8')
  })

  it('keeps distinct steps when the seed is near the light end of the curve', () => {
    const ramp = generateHueRamp('#cbd5e1', { mode: 'dark', anchor: 400 })
    expect(new Set(Object.values(ramp)).size).toBeGreaterThan(8)
  })

  it('tunes dark separately instead of inverting the light ramp', () => {
    const seed = '#1d4ed8'
    const light = generateHueRamp(seed, { mode: 'light', anchor: 700 })
    const dark = generateHueRamp(seed, { mode: 'dark', anchor: 400 })
    const lightL = RAMP_STEPS.map((step) => oklchOf(light[String(step)]).l)
    const darkL = RAMP_STEPS.map((step) => oklchOf(dark[String(step)]).l)
    const invertedLightL = [...lightL].reverse()

    expect(dark['400']).toBe('#1d4ed8')
    expect(darkL).not.toEqual(invertedLightL)
    expect(darkL[0]).toBeGreaterThan(darkL[darkL.length - 1] ?? 0)
    expect(lightL[0]).toBeGreaterThan(lightL[lightL.length - 1] ?? 0)
    expect(
      Math.abs(
        (darkL[darkL.length - 1] ?? 0) - (lightL[lightL.length - 1] ?? 0),
      ),
    ).toBeGreaterThan(0.001)
  })

  it('builds DTCG primitives for every hue in both modes from seeds.json', async () => {
    const seeds: unknown = JSON.parse(await readFile(seedsPath, 'utf8'))
    const tree = generateRampDocument(seeds)

    expect(tokenValue(tree, ['color', 'primary', '50'])).toMatch(
      /^#[0-9a-f]{6}$/,
    )
    expect(tokenValue(tree, ['color', 'primary', '700'])).toBe('#1d4ed8')
    expect(tokenValue(tree, ['color', 'primary', 'dark', '400'])).toBe(
      '#60a5fa',
    )
    expect(tokenValue(tree, ['color', 'danger', '700'])).toBe('#b91c1c')
    expect(tokenValue(tree, ['color', 'danger', 'dark', '400'])).toBe('#f87171')
    expect(tokenValue(tree, ['color', 'success', '700'])).toBe('#15803d')
    expect(RAMP_HUES).toEqual([
      'neutral',
      'primary',
      'success',
      'warning',
      'danger',
      'info',
    ])
  })
})

function tokenValue(node: unknown, path: string[]): string {
  let current: unknown = node
  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(`missing ${path.join('.')}`)
    }
    const record: Record<string, unknown> = { ...current }
    current = record[key]
  }
  if (
    typeof current !== 'object' ||
    current === null ||
    !('$value' in current)
  ) {
    throw new Error(`missing $value at ${path.join('.')}`)
  }
  const value = current.$value
  if (typeof value !== 'string') {
    throw new Error(`$value is not a string at ${path.join('.')}`)
  }
  return value
}
