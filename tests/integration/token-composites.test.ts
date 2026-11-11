/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  serializeCubicBezier,
  serializeGradient,
  serializeShadow,
} from '../../packages/themes/scripts/lib/composite-tokens.js'
import { compileTokenDocuments } from '../../packages/themes/scripts/lib/compile-tokens.js'

describe('DTCG composite tokens', () => {
  it('serializes layered shadows with inset highlights', () => {
    expect(
      serializeShadow([
        {
          offsetX: '0px',
          offsetY: '2px',
          blur: '4px',
          spread: '0px',
          color: 'oklch(0.25 0.02 258 / 0.08)',
        },
        {
          offsetX: '0px',
          offsetY: '4px',
          blur: '10px',
          color: 'oklch(0.25 0.02 258 / 0.14)',
        },
      ]),
    ).toBe(
      '0px 2px 4px 0px oklch(0.25 0.02 258 / 0.08), 0px 4px 10px 0px oklch(0.25 0.02 258 / 0.14)',
    )
    expect(
      serializeShadow({
        offsetX: '0px',
        offsetY: '1px',
        blur: '0px',
        color: 'oklch(1 0 0 / 0.12)',
        inset: true,
      }),
    ).toBe('inset 0px 1px 0px 0px oklch(1 0 0 / 0.12)')
  })

  it('serializes oklch linear and layered radial gradients', () => {
    expect(
      serializeGradient({
        style: 'linear',
        interpolation: 'oklch',
        angle: '135deg',
        stops: [
          { color: '#356af3', position: 0 },
          { color: '#579dd1', position: 1 },
        ],
      }),
    ).toBe('linear-gradient(135deg in oklch, #356af3 0%, #579dd1 100%)')
    expect(
      serializeGradient([
        {
          style: 'radial',
          interpolation: 'oklch',
          at: '14% 18%',
          stops: [
            { color: '#d6e3ff', position: 0 },
            { color: 'transparent', position: 0.52 },
          ],
        },
      ]),
    ).toBe('radial-gradient(in oklch at 14% 18%, #d6e3ff 0%, transparent 52%)')
  })

  it('resolves aliases inside shadow colors and interpolates CSS strings', () => {
    const compiled = compileTokenDocuments([
      {
        file: 'primitives.json',
        tier: 'primitive',
        tree: {
          color: {
            ink: { $type: 'color', $value: '#0f172a' },
          },
        },
      },
      {
        file: 'semantic.json',
        tier: 'semantic',
        tree: {
          elevation: {
            1: {
              shadow: {
                $type: 'shadow',
                $value: [
                  {
                    offsetX: '0px',
                    offsetY: '1px',
                    blur: '2px',
                    color: '{color.ink}',
                  },
                ],
              },
            },
          },
          gradient: {
            accent: {
              $type: 'gradient',
              $value: {
                style: 'linear',
                interpolation: 'oklch',
                angle: '90deg',
                stops: [
                  { color: '{color.ink}', position: 0 },
                  { color: 'transparent', position: 0.55 },
                ],
              },
            },
          },
        },
      },
    ])

    const shadow = compiled.tokens.find(
      (token) => token.name === 'elevation.1.shadow',
    )
    const gradient = compiled.tokens.find(
      (token) => token.name === 'gradient.accent',
    )
    expect(shadow?.value.light).toBe('0px 1px 2px 0px #0f172a')
    expect(gradient?.value.light).toBe(
      'linear-gradient(90deg in oklch, #0f172a 0%, transparent 55%)',
    )
    expect(compiled.css).toContain(
      '--sl-elevation-1-shadow: 0px 1px 2px 0px #0f172a;',
    )
  })

  it('serializes cubicBezier tokens and spring settle durations', () => {
    expect(serializeCubicBezier([0.2, 0, 0, 1])).toBe(
      'cubic-bezier(0.2, 0, 0, 1)',
    )

    const compiled = compileTokenDocuments([
      {
        file: 'primitives.json',
        tier: 'primitive',
        tree: {
          spring: {
            gentle: {
              $type: 'spring',
              $value: { stiffness: 280, damping: 33.47, mass: 1 },
            },
          },
          easing: {
            standard: {
              $type: 'cubicBezier',
              $value: [0.2, 0, 0, 1],
            },
          },
        },
      },
      {
        file: 'semantic.json',
        tier: 'semantic',
        tree: {
          motion: {
            easing: {
              standard: {
                $type: 'cubicBezier',
                $value: '{easing.standard}',
              },
            },
            spring: {
              gentle: {
                $type: 'spring',
                $value: '{spring.gentle}',
                duration: {
                  $type: 'duration',
                  $value: '{spring.gentle}',
                  $extensions: {
                    'slop.ui': { reducedMotion: '80ms' },
                  },
                },
              },
            },
          },
        },
      },
    ])

    const easing = compiled.tokens.find(
      (token) => token.name === 'motion.easing.standard',
    )
    const spring = compiled.tokens.find(
      (token) => token.name === 'motion.spring.gentle',
    )
    const duration = compiled.tokens.find(
      (token) => token.name === 'motion.spring.gentle.duration',
    )
    expect(easing?.value.light).toBe('cubic-bezier(0.2, 0, 0, 1)')
    expect(spring?.value.light.startsWith('linear(')).toBe(true)
    expect(duration?.value.light).toMatch(/^\d+ms$/)
    expect(compiled.css).toContain('--sl-motion-spring-gentle-duration: calc(')
  })
})
