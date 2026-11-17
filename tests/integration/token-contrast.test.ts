/** @vitest-environment node */

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
      'surface.muted.bg',
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

    // Preview stage, muted wells, and resting cards must be distinct surfaces.
    expect(byName.get('elevation.1.bg')).not.toBe(
      byName.get('surface.subtle.bg'),
    )
    expect(byName.get('elevation.1.bg')).not.toBe(byName.get('surface.bg'))
    expect(byName.get('elevation.3.bg')).not.toBe(
      byName.get('surface.muted.bg'),
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
})
