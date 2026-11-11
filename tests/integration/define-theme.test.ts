/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  applyContrastAdjustments,
  defineTheme,
  DefineThemeError,
  FLAGSHIP_THEME_INPUTS,
} from '../../packages/themes/scripts/lib/define-theme.js'
import { evaluateContrast } from '../../packages/themes/scripts/lib/contrast.js'

describe('defineTheme', () => {
  it('applies documented defaults', () => {
    const theme = defineTheme({ name: 'acme', primary: '#0f766e' })

    expect(theme.name).toBe('acme')
    expect(theme.manifest.theme).toBe('acme')
    expect(theme.manifest.defaultDensity).toBe('comfortable')
    expect(
      theme.tokens.find((token) => token.name === 'roundness.amount')?.value
        .light,
    ).toBe('1')
    expect(
      theme.tokens.find((token) => token.name === 'motion.intensity')?.value
        .light,
    ).toBe('1')
    expect(theme.css).toContain("[data-sl-theme='acme']")
    expect(theme.css).not.toMatch(/:where\(\.slop-themed-scope/)
    expect(theme.css).toContain('--sl-roundness: 1;')
  })

  it('throws on reserved names, bad hues, and invalid enums', () => {
    expect(() => defineTheme({ name: 'default', primary: 200 })).toThrow(
      DefineThemeError,
    )
    expect(() => defineTheme({ name: 'Nope', primary: 200 })).toThrow(
      /kebab-case/,
    )
    expect(() => defineTheme({ name: 'acme', primary: 400 })).toThrow(
      /between 0 and 360/,
    )
    expect(() =>
      defineTheme({ name: 'acme', primary: 'currentColor' }),
    ).toThrow(/absolute color/)
    expect(() =>
      defineTheme({ name: 'acme', primary: 200, density: 'cozy' } as never),
    ).toThrow(/density/)
    expect(() =>
      defineTheme({ name: 'acme', primary: 200, roundness: 2 }),
    ).toThrow(/roundness/)
  })

  it('auto-adjusts action fills so a light brand seed still meets AA', () => {
    const theme = defineTheme({ name: 'sun', primary: '#facc15' })
    const bg = theme.tokens.find((token) => token.name === 'action.primary.bg')
    const fg = theme.tokens.find((token) => token.name === 'action.primary.fg')

    expect(bg?.value.light).not.toBe('#facc15')
    expect(fg?.value.light).toBe('#ffffff')
    expect(
      evaluateContrast(theme.tokens).filter((row) => !row.passesWcagAa),
    ).toEqual([])
  })

  it('throws when no foreground candidate can meet AA', () => {
    expect(() =>
      applyContrastAdjustments([
        {
          name: 'surface.bg',
          tier: 'semantic',
          type: 'color',
          value: { light: '#777777', dark: '#777777' },
        },
        {
          name: 'surface.fg',
          tier: 'semantic',
          type: 'color',
          value: { light: '#777777', dark: '#777777' },
        },
      ]),
    ).toThrow(DefineThemeError)
  })
})

describe('flagship themes', () => {
  it('compiles calm, vibrant, and mono through the WCAG AA gate', async () => {
    for (const input of FLAGSHIP_THEME_INPUTS) {
      const theme = defineTheme(input)
      const failures = evaluateContrast(theme.tokens).filter(
        (row) => !row.passesWcagAa,
      )
      expect(failures, JSON.stringify(failures, null, 2)).toEqual([])
      expect(theme.css).toContain(`[data-sl-theme='${input.name}']`)
      expect(theme.css).not.toMatch(/:where\(\.slop-themed-scope/)
      expect(
        await readFile(
          resolve(
            process.cwd(),
            `packages/themes/src/generated/${input.name}.css`,
          ),
          'utf8',
        ),
      ).toBe(theme.css)
    }
  })
})
