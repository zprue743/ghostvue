/** @vitest-environment node */
import { describe, expect, it } from 'vitest'

import { planGhostVueNuxt } from './plan'

describe('planGhostVueNuxt', () => {
  it('defaults to headless components and composables with no CSS', () => {
    const plan = planGhostVueNuxt()
    expect(plan.css).toEqual([])
    expect(plan.requiresThemes).toBe(false)
    expect(plan.components.length).toBeGreaterThan(100)
    expect(new Set(plan.components.map(({ from }) => from))).toEqual(
      new Set(['@ghostvue/vue']),
    )
    expect(plan.components).toContainEqual({
      name: 'GhostButton',
      from: '@ghostvue/vue',
    })
    expect(plan.composables).toContainEqual({
      name: 'useGhostId',
      from: '@ghostvue/vue',
    })
    expect(planGhostVueNuxt({})).toEqual(plan)
  })

  it('registers every component name exactly once in each mode', () => {
    for (const components of ['headless', 'themed'] as const) {
      const names = planGhostVueNuxt({ components }).components.map(
        ({ name }) => name,
      )
      expect(new Set(names).size, components).toBe(names.length)
    }
  })

  it('resolves themed wrappers to @ghostvue/themes and keeps headless-only utilities headless', () => {
    const plan = planGhostVueNuxt({ components: 'themed' })
    const from = new Map(plan.components.map(({ name, from }) => [name, from]))
    expect(from.get('GhostButton')).toBe('@ghostvue/themes')
    expect(from.get('GhostDialogContent')).toBe('@ghostvue/themes')
    expect(from.get('GhostPortal')).toBe('@ghostvue/vue')
    expect(from.get('GhostVisuallyHidden')).toBe('@ghostvue/vue')
    expect(plan.requiresThemes).toBe(true)
    // Themed components alone do not add a flagship stylesheet.
    expect(plan.css).toEqual([])
  })

  it('injects only the stylesheets that are opted into, once each', () => {
    const plan = planGhostVueNuxt({ css: ['calm', 'tokens', 'calm'] })
    expect(plan.css).toEqual([
      '@ghostvue/themes/calm.css',
      '@ghostvue/themes/tokens.css',
    ])
    expect(plan.requiresThemes).toBe(true)
    expect(plan.components.every(({ from }) => from === '@ghostvue/vue')).toBe(
      true,
    )
  })

  it('can disable components and composables', () => {
    const plan = planGhostVueNuxt({ components: false, composables: false })
    expect(plan.components).toEqual([])
    expect(plan.composables).toEqual([])
    expect(plan.requiresThemes).toBe(false)
  })

  it('rejects unknown modes and stylesheets instead of guessing', () => {
    expect(() =>
      planGhostVueNuxt({
        components: 'styled' as unknown as 'themed',
      }),
    ).toThrow(/Unknown components mode "styled"/)
    expect(() =>
      planGhostVueNuxt({ css: ['dark' as unknown as 'calm'] }),
    ).toThrow(/Unknown stylesheet "dark"/)
  })
})
