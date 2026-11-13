import { describe, expect, it } from 'vitest'

import { formatCoverageSummary } from '../../scripts/coverage-summary.mjs'

function counts(covered: number, total: number) {
  return { covered, total }
}

function coverage(covered: number, total: number) {
  return {
    lines: counts(covered, total),
    statements: counts(covered, total),
    functions: counts(covered, total),
    branches: counts(covered, total),
  }
}

describe('coverage summary', () => {
  it('reports the total and weights package metrics by their counts', () => {
    const summary = {
      total: {
        lines: counts(80, 100),
        statements: counts(9, 10),
        functions: counts(7, 10),
        branches: counts(1, 3),
      },
      '/repo/packages/core/src/a.ts': coverage(1, 1),
      '/repo/packages/core/src/nested/b.ts': {
        lines: counts(7, 9),
        statements: counts(7, 8),
        functions: counts(0, 1),
        branches: counts(0, 0),
      },
      'packages/shared/src/index.ts': coverage(0, 0),
      '/repo/packages/themes/src/index.ts': coverage(3, 4),
      'C:\\repo\\packages\\vue\\src\\index.ts': coverage(9, 10),
      // Theme compiler coverage belongs only in the provided global total.
      '/repo/packages/themes/scripts/lib/compiler.js': coverage(0, 100),
      '/repo/packages/core/src-other/ignored.ts': coverage(0, 100),
    }

    expect(formatCoverageSummary(summary)).toBe(
      [
        '## Coverage',
        '',
        'Line coverage gate: 80% for the total and each package source directory.',
        '',
        '| Scope | Lines | Statements | Functions | Branches |',
        '| --- | --- | --- | --- | --- |',
        '| Total | 80.00% PASS | 90.00% | 70.00% | 33.33% |',
        '| packages/core/src | 80.00% PASS | 88.88% | 50.00% | 100.00% |',
        '| packages/shared/src | 100.00% PASS | 100.00% | 100.00% | 100.00% |',
        '| packages/themes/src | 75.00% FAIL | 75.00% | 75.00% | 75.00% |',
        '| packages/vue/src | 90.00% PASS | 90.00% | 90.00% | 90.00% |',
        '',
      ].join('\n'),
    )
  })

  it('marks global and package lines below 80% as failing', () => {
    const output = formatCoverageSummary({
      total: coverage(7999, 10000),
      'packages/core/src/index.ts': coverage(7999, 10000),
    })

    expect(output).toContain('| Total | 79.99% FAIL |')
    expect(output).toContain('| packages/core/src | 79.99% FAIL |')
  })
})
