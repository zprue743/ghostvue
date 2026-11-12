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
    expect(theme.css).toContain("[data-ghost-theme='acme']")
    expect(theme.css).not.toMatch(/:where\(\.ghost-themed-scope/)
    expect(theme.css).toContain('--ghost-roundness: 1;')
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
    expect(() =>
      defineTheme({
        name: 'acme',
        primary: 200,
        interactivity: 'loud',
      } as never),
    ).toThrow(/interactivity/)
  })

  it('maps interactivity flavors onto spotlight tokens', () => {
    const subtle = defineTheme({ name: 'acme', primary: '#0f766e' })
    expect(
      subtle.tokens.find((token) => token.name === 'interactive.spotlight.size')
        ?.value.light,
    ).toBe('10rem')
    expect(
      subtle.tokens.find(
        (token) => token.name === 'interactive.spotlight.opacity',
      )?.value.light,
    ).toBe('0.28')

    const none = defineTheme({
      name: 'quiet',
      primary: '#0f766e',
      interactivity: 'none',
    })
    expect(
      none.tokens.find((token) => token.name === 'interactive.spotlight.size')
        ?.value.light,
    ).toBe('0px')
    expect(
      none.tokens.find(
        (token) => token.name === 'interactive.spotlight.opacity',
      )?.value.light,
    ).toBe('0')

    const expressive = defineTheme({
      name: 'loud',
      primary: '#0f766e',
      interactivity: 'expressive',
    })
    expect(
      expressive.tokens.find(
        (token) => token.name === 'interactive.spotlight.size',
      )?.value.light,
    ).toBe('20rem')
    expect(
      expressive.tokens.find(
        (token) => token.name === 'interactive.spotlight.opacity',
      )?.value.light,
    ).toBe('0.75')
  })

  it('assigns flagship interactivity recipes', () => {
    const byName = Object.fromEntries(
      FLAGSHIP_THEME_INPUTS.map((input) => [input.name, input]),
    )
    expect(byName.calm?.interactivity).toBe('subtle')
    expect(byName.mono?.interactivity).toBe('subtle')
    expect(byName.vibrant?.interactivity).toBe('expressive')

    const vibrantInput = FLAGSHIP_THEME_INPUTS.find(
      (input) => input.name === 'vibrant',
    )
    expect(vibrantInput).toBeDefined()
    if (!vibrantInput) return
    const vibrant = defineTheme(vibrantInput)
    expect(
      vibrant.tokens.find(
        (token) => token.name === 'interactive.spotlight.opacity',
      )?.value.light,
    ).toBe('0.75')
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
      expect(theme.css).toContain(`[data-ghost-theme='${input.name}']`)
      expect(theme.css).not.toMatch(/:where\(\.ghost-themed-scope/)
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
