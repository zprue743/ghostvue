/** @vitest-environment node */

import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  compileThemeTokens,
  compileTokenDocuments,
} from '../../packages/themes/scripts/lib/compile-tokens.js'
import {
  contrastPairs,
  evaluateContrast,
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
})
