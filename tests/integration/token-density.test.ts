/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  compileTokenDocuments,
  densityCssValue,
  maxCssDimension,
  usesRoundness,
} from '../../packages/themes/scripts/lib/compile-tokens.js'

describe('density, roundness, and touch-min compile', () => {
  it('overlays compact and spacious values without changing light/dark', () => {
    const compiled = compileTokenDocuments([
      {
        file: 'primitives.json',
        tier: 'primitive',
        tree: {
          space: {
            1: { $type: 'dimension', $value: '0.25rem' },
            2: { $type: 'dimension', $value: '0.5rem' },
            3: { $type: 'dimension', $value: '0.75rem' },
          },
          radius: {
            scale: {
              sm: { $type: 'dimension', $value: '0.25rem' },
              md: { $type: 'dimension', $value: '0.5rem' },
            },
          },
        },
      },
      {
        file: 'semantic.json',
        tier: 'semantic',
        tree: {
          space: {
            gap: {
              sm: { $type: 'dimension', $value: '{space.2}' },
            },
          },
          radius: {
            md: { $type: 'dimension', $value: '{radius.scale.md}' },
          },
          control: {
            size: {
              md: {
                min: {
                  $type: 'dimension',
                  $value: '2.5rem',
                  $extensions: { ghostvue: { touchMin: '2.75rem' } },
                },
              },
            },
          },
          roundness: {
            amount: { $type: 'number', $value: 1 },
          },
        },
      },
      {
        file: 'semantic.compact.json',
        tier: 'semantic',
        overlayDensity: 'compact',
        tree: {
          space: {
            gap: {
              sm: { $type: 'dimension', $value: '{space.1}' },
            },
          },
          radius: {
            md: { $type: 'dimension', $value: '{radius.scale.sm}' },
          },
          control: {
            size: {
              md: {
                min: { $type: 'dimension', $value: '2rem' },
              },
            },
          },
        },
      },
      {
        file: 'semantic.spacious.json',
        tier: 'semantic',
        overlayDensity: 'spacious',
        tree: {
          space: {
            gap: {
              sm: { $type: 'dimension', $value: '{space.3}' },
            },
          },
          control: {
            size: {
              md: {
                min: { $type: 'dimension', $value: '3rem' },
              },
            },
          },
        },
      },
    ])

    const gap = compiled.tokens.find((token) => token.name === 'space.gap.sm')
    const radius = compiled.tokens.find((token) => token.name === 'radius.md')
    const min = compiled.tokens.find(
      (token) => token.name === 'control.size.md.min',
    )
    const roundness = compiled.tokens.find(
      (token) => token.name === 'roundness.amount',
    )

    expect(gap).toBeDefined()
    expect(radius).toBeDefined()
    expect(min).toBeDefined()
    expect(roundness).toBeDefined()
    if (!gap || !radius || !min || !roundness) return

    expect(gap.value.light).toBe('0.5rem')
    expect(gap.density).toEqual({ compact: '0.25rem', spacious: '0.75rem' })
    expect(densityCssValue(gap, 'compact')).toBe('0.25rem')
    expect(densityCssValue(gap, 'comfortable')).toBe('0.5rem')
    expect(densityCssValue(gap, 'spacious')).toBe('0.75rem')

    expect(usesRoundness(radius)).toBe(true)
    expect(usesRoundness(roundness)).toBe(false)
    expect(roundness.cssVar).toBe('--ghost-roundness')
    expect(compiled.css).toContain(
      '--ghost-radius-md: calc(0.5rem * var(--ghost-roundness, 1));',
    )
    expect(compiled.css).toContain(
      '--ghost-radius-md: calc(0.25rem * var(--ghost-roundness, 1));',
    )
    expect(compiled.css).toContain("[data-ghost-density='compact']")
    expect(compiled.css).toContain("[data-ghost-density='comfortable']")
    expect(compiled.css).toContain("[data-ghost-density='spacious']")

    expect(min.touchMin).toBe('2.75rem')
    expect(compiled.css).toContain('pointer: coarse')
    expect(compiled.css).toContain('--ghost-control-size-md-min: 2.75rem;')
    expect(maxCssDimension('2rem', '2.75rem')).toBe('2.75rem')
    expect(maxCssDimension('3rem', '2.75rem')).toBe('3rem')
  })

  it('rejects a density overlay that does not match a semantic base token', () => {
    expect(() =>
      compileTokenDocuments([
        {
          file: 'semantic.json',
          tier: 'semantic',
          tree: {
            space: {
              gap: { sm: { $type: 'dimension', $value: '0.5rem' } },
            },
          },
        },
        {
          file: 'semantic.compact.json',
          tier: 'semantic',
          overlayDensity: 'compact',
          tree: {
            space: {
              gap: { md: { $type: 'dimension', $value: '0.25rem' } },
            },
          },
        },
      ]),
    ).toThrow(/has no base token/)
  })
})
