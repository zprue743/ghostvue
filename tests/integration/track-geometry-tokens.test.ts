/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  compileThemeTokens,
  densityCssValue,
  dimensionToPx,
  TOKEN_DENSITIES,
} from '../../packages/themes/scripts/lib/compile-tokens.js'
import {
  defineTheme,
  FLAGSHIP_THEME_INPUTS,
} from '../../packages/themes/scripts/lib/define-theme.js'

// GHO-182: Progress and Slider paint must never read layout gap tokens, which
// collapse to 0 at compact density (and Calm defaults to compact when
// data-ghost-density is unset).
const TRACK_TOKENS = [
  'track.thickness.sm',
  'track.thickness.md',
  'track.thickness.lg',
  'track.thumb.sm',
  'track.thumb.md',
  'track.thumb.lg',
  'track.target',
] as const

const tokensDir = resolve(process.cwd(), 'packages/themes/tokens')
const generatedDir = resolve(process.cwd(), 'packages/themes/src/generated')

function trackDeclarations(css: string) {
  return [...css.matchAll(/(--ghost-track-[a-z-]+):\s*([^;]+);/g)].map(
    ([, name, value]) => ({ name: name ?? '', value: value?.trim() ?? '' }),
  )
}

describe('track geometry tokens', () => {
  it('compiles density-independent, nonzero painted sizes with 4/6/8px thickness', async () => {
    const { tokens } = await compileThemeTokens(tokensDir)

    for (const name of TRACK_TOKENS) {
      const token = tokens.find((candidate) => candidate.name === name)
      expect(token, name).toBeDefined()
      if (!token) continue
      // No density overlay: compact/spacious selectors cannot redefine paint.
      expect(token.density, name).toBeUndefined()
      for (const density of TOKEN_DENSITIES) {
        expect(dimensionToPx(densityCssValue(token, density)), name).toBe(
          dimensionToPx(token.value.light),
        )
      }
      expect(dimensionToPx(token.value.light), name).toBeGreaterThan(0)
      expect(token.value.dark, name).toBe(token.value.light)
    }

    const px = (name: string) =>
      dimensionToPx(
        tokens.find((token) => token.name === name)?.value.light ?? '',
      )
    expect([
      px('track.thickness.sm'),
      px('track.thickness.md'),
      px('track.thickness.lg'),
    ]).toEqual([4, 6, 8])
    // Thumbs out-size their track so the handle stays distinguishable.
    for (const size of ['sm', 'md', 'lg']) {
      expect(px(`track.thumb.${size}`)).toBeGreaterThan(
        px(`track.thickness.${size}`) ?? Number.POSITIVE_INFINITY,
      )
    }
  })

  it.each(['tokens', 'calm', 'vibrant', 'mono'])(
    'declares every track token with a nonzero value in generated %s.css',
    async (file) => {
      const css = await readFile(resolve(generatedDir, `${file}.css`), 'utf8')
      const declarations = trackDeclarations(css)
      const names = new Set(declarations.map(({ name }) => name))
      for (const token of TRACK_TOKENS) {
        expect(names, token).toContain(`--ghost-${token.replaceAll('.', '-')}`)
      }
      for (const { name, value } of declarations) {
        expect(dimensionToPx(value), `${name}: ${value}`).toBeGreaterThan(0)
      }
    },
  )

  it('keeps track tokens nonzero inside the Calm unset-density block where gap.xs is 0', () => {
    const calm = FLAGSHIP_THEME_INPUTS.find((input) => input.name === 'calm')
    expect(calm?.density).toBe('compact')
    if (!calm) return
    const { css } = defineTheme(calm)

    const unsetBlock =
      /:where\(\[data-ghost-theme='calm'\]\):not\(\[data-ghost-density\]\)[^{]*\{([^}]*)\}/.exec(
        css,
      )?.[1]
    expect(unsetBlock).toBeDefined()
    // The regression this guards: compact gap.xs used to size the sm track.
    expect(unsetBlock).toMatch(/--ghost-space-gap-xs:\s*0px;/)
    for (const { name, value } of trackDeclarations(unsetBlock ?? '')) {
      expect(dimensionToPx(value), name).toBeGreaterThan(0)
    }
    for (const { name, value } of trackDeclarations(css)) {
      expect(dimensionToPx(value), name).toBeGreaterThan(0)
    }
  })
})
