/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { oklchOf } from '../../packages/themes/scripts/lib/generate-ramps.js'

import {
  compileThemeTokens,
  compileTokenDocuments,
} from '../../packages/themes/scripts/lib/compile-tokens.js'
import {
  contrastPairs,
  evaluateContrast,
  extractGradientStopColors,
} from '../../packages/themes/scripts/lib/contrast.js'
import {
  defineTheme,
  FLAGSHIP_THEME_INPUTS,
} from '../../packages/themes/scripts/lib/define-theme.js'

function relativeLuminance(hex: string): number {
  const numeric = Number.parseInt(hex.slice(1), 16)
  const channels = [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255]
  const linear = channels.map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function wcagContrastRatio(firstHex: string, secondHex: string): number {
  const first = relativeLuminance(firstHex)
  const second = relativeLuminance(secondHex)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

const tokensDir = resolve(process.cwd(), 'packages/themes/tokens')

describe('semantic contrast gate', () => {
  it('pairs every text token with the canvas and every *.fg with matching *.bg', () => {
    const pairs = contrastPairs([
      { name: 'surface.bg', tier: 'semantic', type: 'color' },
      { name: 'surface.fg', tier: 'semantic', type: 'color' },
      { name: 'text.default', tier: 'semantic', type: 'color' },
      { name: 'text.muted', tier: 'semantic', type: 'color' },
      { name: 'action.primary.bg', tier: 'semantic', type: 'color' },
      { name: 'action.primary.bg.hover', tier: 'semantic', type: 'color' },
      { name: 'action.primary.fg', tier: 'semantic', type: 'color' },
      { name: 'action.radius', tier: 'semantic', type: 'dimension' },
    ])

    expect(pairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fg: 'text.default', bg: 'surface.bg' }),
        expect.objectContaining({ fg: 'text.muted', bg: 'surface.bg' }),
        expect.objectContaining({
          fg: 'action.primary.fg',
          bg: 'action.primary.bg',
        }),
        expect.objectContaining({
          fg: 'action.primary.fg',
          bg: 'action.primary.bg.hover',
        }),
        expect.objectContaining({ fg: 'surface.fg', bg: 'surface.bg' }),
      ]),
    )
    expect(pairs.some((pair) => pair.fg === 'action.radius')).toBe(false)
  })

  it('pairs action foreground with each gradient end stop', () => {
    const pairs = contrastPairs([
      { name: 'action.primary.fg', tier: 'semantic', type: 'color' },
      { name: 'action.primary.bg', tier: 'semantic', type: 'color' },
      { name: 'action.primary.gradient.from', tier: 'semantic', type: 'color' },
      { name: 'action.primary.gradient.to', tier: 'semantic', type: 'color' },
    ])

    expect(pairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fg: 'action.primary.fg',
          bg: 'action.primary.gradient.from',
          reason: 'fg/gradient stop',
        }),
        expect.objectContaining({
          fg: 'action.primary.fg',
          bg: 'action.primary.gradient.to',
          reason: 'fg/gradient stop',
        }),
      ]),
    )
  })

  it('pairs canvas text with each elevation fill and glass fallback', () => {
    const pairs = contrastPairs([
      { name: 'surface.fg', tier: 'semantic', type: 'color' },
      { name: 'text.default', tier: 'semantic', type: 'color' },
      { name: 'text.muted', tier: 'semantic', type: 'color' },
      { name: 'text.subtle', tier: 'semantic', type: 'color' },
      { name: 'elevation.2.bg', tier: 'semantic', type: 'color' },
      { name: 'material.glass.fallback.bg', tier: 'semantic', type: 'color' },
      { name: 'material.solid.bg', tier: 'semantic', type: 'color' },
    ])

    expect(pairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fg: 'text.default',
          bg: 'elevation.2.bg',
        }),
        expect.objectContaining({
          fg: 'text.subtle',
          bg: 'elevation.2.bg',
        }),
        expect.objectContaining({
          fg: 'text.default',
          bg: 'material.glass.fallback.bg',
        }),
      ]),
    )
  })

  it('fails WCAG AA when a semantic text/background pair is identical', () => {
    const compiled = compileTokenDocuments([
      {
        file: 'semantic.json',
        tier: 'semantic',
        tree: {
          surface: {
            bg: { $type: 'color', $value: '#ffffff' },
            fg: { $type: 'color', $value: '#ffffff' },
          },
          text: {
            default: { $type: 'color', $value: '#ffffff' },
          },
        },
      },
    ])

    const results = evaluateContrast(compiled.tokens)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.passesWcagAa)).toBe(false)
    expect(results.every((result) => typeof result.apca === 'number')).toBe(
      true,
    )
  })

  it('requires WCAG 2 AA for the compiled catalog and reports APCA as numbers', async () => {
    const compiled = await compileThemeTokens(tokensDir)
    const results = evaluateContrast(compiled.tokens)

    expect(results.length).toBeGreaterThan(0)
    const failures = results.filter((result) => !result.passesWcagAa)
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([])
    expect(results.every((result) => Number.isFinite(result.apca))).toBe(true)
  })

  it('validates rendered gradient stops against action foregrounds', () => {
    expect(
      extractGradientStopColors(
        'linear-gradient(165deg in oklch, #facc15 0%, #b49200 100%)',
      ),
    ).toEqual(['#facc15', '#b49200'])

    const results = evaluateContrast([
      {
        name: 'action.primary.fg',
        tier: 'semantic',
        type: 'color',
        value: { light: '#ffffff', dark: '#0f172a' },
      },
      {
        name: 'action.primary.gradient.from',
        tier: 'semantic',
        type: 'color',
        value: { light: '#725b00', dark: '#fde047' },
      },
      {
        name: 'action.primary.gradient.to',
        tier: 'semantic',
        type: 'color',
        value: { light: '#3e3000', dark: '#fef08a' },
      },
      {
        name: 'gradient.action.primary',
        tier: 'semantic',
        type: 'gradient',
        value: {
          light: 'linear-gradient(165deg in oklch, #facc15 0%, #b49200 100%)',
          dark: 'linear-gradient(165deg in oklch, #fde047 0%, #fef08a 100%)',
        },
      },
    ])

    const lightFailures = results.filter(
      (row) => row.mode === 'light' && !row.passesWcagAa,
    )
    expect(lightFailures).toHaveLength(2)
    expect(lightFailures.map((row) => row.bgValue)).toEqual([
      '#facc15',
      '#b49200',
    ])
  })

  it('maintains a distinct, monotonic dark surface and elevation hierarchy', async () => {
    const compiled = await compileThemeTokens(tokensDir)
    const byName = new Map(
      compiled.tokens.map((token) => [token.name, token.value.dark]),
    )

    const darkRoles = [
      'surface.bg',
      'surface.subtle.bg',
      'elevation.1.bg',
      'elevation.2.bg',
      'elevation.3.bg',
      'elevation.4.bg',
      'elevation.5.bg',
    ] as const

    const hexes = darkRoles.map((role) => {
      const value = byName.get(role) ?? ''
      expect(value, `${role} should exist`).toMatch(/^#[0-9a-f]{6}$/i)
      return value
    })

    const mutedBg = byName.get('surface.muted.bg') ?? ''
    expect(mutedBg, 'surface.muted.bg should exist').toMatch(/^#[0-9a-f]{6}$/i)

    // Preview stage, muted wells, and resting cards must be distinct surfaces.
    expect(byName.get('elevation.1.bg')).not.toBe(
      byName.get('surface.subtle.bg'),
    )
    expect(byName.get('elevation.1.bg')).not.toBe(byName.get('surface.bg'))
    expect(byName.get('elevation.3.bg')).not.toBe(mutedBg)
    // Skeleton fill (surface.muted.bg) must stay lighter than its shimmer (surface.subtle.bg).
    expect(oklchOf(mutedBg).l).toBeGreaterThan(
      oklchOf(byName.get('surface.subtle.bg') ?? '').l,
    )

    const lightnesses = hexes.map((hex) => oklchOf(hex).l)
    for (let index = 1; index < lightnesses.length; index += 1) {
      const currentRole = darkRoles[index] ?? ''
      const previousRole = darkRoles[index - 1] ?? ''
      const currentL = lightnesses[index] ?? 0
      const previousL = lightnesses[index - 1] ?? 0
      expect(
        currentL,
        `${currentRole} should be lighter than ${previousRole}`,
      ).toBeGreaterThan(previousL)
    }
  })

  it('meets dark-mode 3:1 non-text contrast for unchecked Switch and Slider tracks across all themes', async () => {
    const switchCss = readFileSync(
      resolve(process.cwd(), 'packages/themes/src/ghost-switch.css'),
      'utf8',
    )
    const sliderCss = readFileSync(
      resolve(process.cwd(), 'packages/themes/src/ghost-slider.css'),
      'utf8',
    )
    const switchTrackVar =
      /--_ghost-switch-track:\s*var\((--ghost-[a-z0-9-]+)\)/.exec(
        switchCss,
      )?.[1]
    const sliderTrackVar =
      /--_ghost-slider-track:\s*var\((--ghost-[a-z0-9-]+)\)/.exec(
        sliderCss,
      )?.[1]
    expect(switchTrackVar).toBeTruthy()
    expect(sliderTrackVar).toBeTruthy()

    const defaultCompiled = await compileThemeTokens(tokensDir)
    const catalogs = [
      { name: 'default', tokens: defaultCompiled.tokens },
      ...FLAGSHIP_THEME_INPUTS.map((input) => ({
        name: input.name,
        tokens: defineTheme(input).tokens,
      })),
    ]

    for (const catalog of catalogs) {
      const byCssVar = new Map(
        catalog.tokens.map((token) => [token.cssVar, token.value.dark]),
      )
      const surfaceBg = byCssVar.get('--ghost-surface-bg') ?? ''
      const switchTrack = byCssVar.get(switchTrackVar ?? '') ?? ''
      const sliderTrack = byCssVar.get(sliderTrackVar ?? '') ?? ''

      expect(surfaceBg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(switchTrack).toMatch(/^#[0-9a-f]{6}$/i)
      expect(sliderTrack).toMatch(/^#[0-9a-f]{6}$/i)

      expect(
        wcagContrastRatio(switchTrack, surfaceBg),
        `${catalog.name} unchecked Switch track vs surface.bg`,
      ).toBeGreaterThanOrEqual(3)
      expect(
        wcagContrastRatio(sliderTrack, surfaceBg),
        `${catalog.name} Slider track vs surface.bg`,
      ).toBeGreaterThanOrEqual(3)
    }
  })
})
