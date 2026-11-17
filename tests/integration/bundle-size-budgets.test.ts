/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  evaluateBudgets,
  findExternalViolations,
  proposeBudget,
  renderMarkdownReport,
} from '../../scripts/lib/bundle-size.js'

const okResult = {
  id: '@ghostvue/vue:GhostButton',
  group: 'component',
  minifiedBytes: 1500,
  gzipBytes: 700,
  problems: [],
}

describe('bundle size budgets', () => {
  it('proposes 10% headroom rounded up to the next 100 bytes', () => {
    expect(proposeBudget(0)).toBe(100)
    expect(proposeBudget(686)).toBe(800)
    expect(proposeBudget(67_330)).toBe(74_100)
  })

  it('fails when a fixture exceeds its budget, has none, or a budget is stale', () => {
    expect(evaluateBudgets([okResult], { [okResult.id]: 700 }).failed).toBe(
      false,
    )

    const over = evaluateBudgets([okResult], { [okResult.id]: 699 })
    expect(over.failed).toBe(true)
    expect(over.rows[0]?.status).toBe('over')

    const missing = evaluateBudgets([okResult], {})
    expect(missing.failed).toBe(true)
    expect(missing.rows[0]?.status).toBe('missing')

    const stale = evaluateBudgets([okResult], {
      [okResult.id]: 800,
      '@ghostvue/vue:GhostRemoved': 500,
    })
    expect(stale.failed).toBe(true)
    expect(stale.stale).toEqual(['@ghostvue/vue:GhostRemoved'])
  })

  it('treats a structural problem as a failure even under budget', () => {
    const evaluation = evaluateBudgets(
      [{ ...okResult, problems: ['unexpected external import "lodash"'] }],
      { [okResult.id]: 10_000 },
    )
    expect(evaluation.failed).toBe(true)
    expect(evaluation.rows[0]?.status).toBe('invalid')
  })

  it('rejects non-Vue externals and a bundled Vue runtime', () => {
    expect(
      findExternalViolations({
        externalImports: ['vue'],
        bundledModules: ['/repo/packages/vue/dist/ghostvue.js'],
      }),
    ).toEqual([])

    expect(
      findExternalViolations({
        externalImports: ['vue', '@floating-ui/dom'],
        bundledModules: [],
      }),
    ).toEqual(['unexpected external import "@floating-ui/dom"'])

    const bundledVue = findExternalViolations({
      externalImports: [],
      bundledModules: [
        '/repo/node_modules/.pnpm/@vue+runtime-core@3.5.45/node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js',
        '/repo/node_modules/vue/dist/vue.runtime.esm-bundler.js',
      ],
    })
    expect(bundledVue).toHaveLength(1)
    expect(bundledVue[0]).toMatch(/bundles the Vue runtime/)
  })

  it('renders a report that calls out failures and lists every component', () => {
    const evaluation = evaluateBudgets(
      [
        { ...okResult, id: '@ghostvue/vue', group: 'entry' },
        okResult,
        { ...okResult, id: '@ghostvue/vue:GhostBadge', gzipBytes: 900 },
      ],
      {
        '@ghostvue/vue': 800,
        [okResult.id]: 800,
        '@ghostvue/vue:GhostBadge': 800,
      },
    )
    const report = renderMarkdownReport(evaluation)
    expect(report).toContain('Bundle size check **failed**')
    expect(report).toContain('### Component imports needing attention')
    expect(report).toMatch(/`@ghostvue\/vue:GhostBadge`.*\*\*over budget\*\*/)
    expect(report).toContain('All 2 single-component imports')
  })
})
