/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TEST_MS,
  buildTimingTable,
  buildUnits,
  collectReportTests,
  formatTestList,
  parseShardArg,
  planShards,
  unitKey,
  type ListedTest,
} from '../../scripts/lib/e2e-shards.js'

function listed(project: string, file: string, count: number): ListedTest[] {
  return Array.from({ length: count }, () => ({ project, file }))
}

function report(
  specs: {
    project: string
    file: string
    status?: string
    durations?: number[]
  }[],
): unknown {
  return {
    suites: [
      {
        title: 'root',
        specs: [],
        suites: specs.map((spec) => ({
          file: spec.file,
          specs: [
            {
              file: spec.file,
              tests: [
                {
                  projectName: spec.project,
                  status: spec.status,
                  results: (spec.durations ?? []).map((duration) => ({
                    duration,
                  })),
                },
              ],
            },
          ],
        })),
      },
    ],
  }
}

describe('e2e shard planning', () => {
  it('parses Playwright-style shard arguments and rejects invalid ones', () => {
    expect(parseShardArg('2/3')).toEqual({ current: 2, total: 3 })
    for (const value of ['0/3', '4/3', '1/0', '1', 'a/b', '1/3/4']) {
      expect(() => parseShardArg(value), value).toThrow(/--shard/)
    }
  })

  it('collects nested report tests and costs every retry attempt', () => {
    const tests = collectReportTests(
      report([
        {
          project: 'chromium-e2e',
          file: 'a.spec.ts',
          status: 'flaky',
          durations: [30_000, 2_000],
        },
      ]),
    )
    expect(tests).toEqual([
      {
        project: 'chromium-e2e',
        file: 'a.spec.ts',
        durationMs: 32_000,
        status: 'flaky',
      },
    ])
  })

  it('builds timings from passing tests and falls back to failures only when nothing passed', () => {
    const table = buildTimingTable(
      report([
        {
          project: 'p',
          file: 'a.spec.ts',
          status: 'expected',
          durations: [1000],
        },
        {
          project: 'p',
          file: 'a.spec.ts',
          status: 'expected',
          durations: [3000],
        },
        // A failing screenshot waits out its assertion timeout; ignore it.
        {
          project: 'p',
          file: 'a.spec.ts',
          status: 'unexpected',
          durations: [9000],
        },
        {
          project: 'p',
          file: 'b.spec.ts',
          status: 'unexpected',
          durations: [5000],
        },
      ]),
    )
    expect(table).toEqual({
      [unitKey('p', 'a.spec.ts')]: 2000,
      [unitKey('p', 'b.spec.ts')]: 5000,
    })
  })

  it('costs unknown units at the project median, or the default without any timings', () => {
    const units = buildUnits(
      [
        ...listed('p', 'known.spec.ts', 2),
        ...listed('p', 'new.spec.ts', 3),
        ...listed('other', 'x.spec.ts', 1),
      ],
      {
        [unitKey('p', 'known.spec.ts')]: 100,
        [unitKey('p', 'gone-1.spec.ts')]: 300,
        [unitKey('p', 'gone-2.spec.ts')]: 500,
      },
    )
    const cost = Object.fromEntries(units.map((u) => [u.key, u.estimatedMs]))
    expect(cost).toEqual({
      [unitKey('p', 'known.spec.ts')]: 200,
      [unitKey('p', 'new.spec.ts')]: 900,
      [unitKey('other', 'x.spec.ts')]: DEFAULT_TEST_MS,
    })
  })

  it('balances heavy and light units by duration rather than test count', () => {
    // Many cheap screenshot tests and a few heavy flows: an equal-count split
    // would put all the heavy work on one shard.
    const tests = [
      ...listed('chromium', 'visual.spec.ts', 400),
      ...listed('e2e', 'heavy-a.spec.ts', 10),
      ...listed('e2e', 'heavy-b.spec.ts', 10),
    ]
    const timings = {
      [unitKey('chromium', 'visual.spec.ts')]: 100,
      [unitKey('e2e', 'heavy-a.spec.ts')]: 4000,
      [unitKey('e2e', 'heavy-b.spec.ts')]: 4000,
    }
    const shards = planShards(buildUnits(tests, timings), 3)
    expect(shards.map((shard) => shard.estimatedMs)).toEqual([
      40_000, 40_000, 40_000,
    ])
    expect(shards.map((shard) => shard.tests).sort((a, b) => a - b)).toEqual([
      10, 10, 400,
    ])
  })

  it('assigns every unit to exactly one shard, deterministically', () => {
    const tests = Array.from({ length: 40 }, (_, index) =>
      listed(
        index % 2 ? 'a' : 'b',
        `f${String(index)}.spec.ts`,
        (index % 5) + 1,
      ),
    ).flat()
    const timings = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [
        unitKey(index % 2 ? 'a' : 'b', `f${String(index)}.spec.ts`),
        ((index * 37) % 11) * 100 + 50,
      ]),
    )
    const units = buildUnits(tests, timings)
    const first = planShards(units, 3)
    // Input order must not change the plan: every matrix job computes it.
    const second = planShards([...units].reverse(), 3)
    expect(second).toEqual(first)

    const assigned = first.flatMap((shard) => shard.units.map((u) => u.key))
    expect(assigned.sort()).toEqual(units.map((u) => u.key).sort())
    expect(first.reduce((sum, shard) => sum + shard.tests, 0)).toBe(
      tests.length,
    )
  })

  it('leaves extra shards empty instead of failing when units run out', () => {
    const shards = planShards(buildUnits(listed('p', 'a.spec.ts', 2), {}), 3)
    expect(shards.map((shard) => shard.units.length)).toEqual([1, 0, 0])
    expect(formatTestList(shards[1])).toBe('')
    expect(() => planShards([], 0)).toThrow(/positive integer/)
  })

  it('renders Playwright --test-list lines that select a project file', () => {
    const [shard] = planShards(
      buildUnits(
        [
          ...listed('chromium-e2e', 'b.spec.ts', 1),
          ...listed('chromium', 'a.spec.ts', 1),
        ],
        {},
      ),
      1,
    )
    expect(formatTestList(shard)).toBe(
      '[chromium-e2e] › b.spec.ts\n[chromium] › a.spec.ts\n',
    )
  })

  it('has a committed timing table keyed by project and spec file', () => {
    const table = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'scripts/e2e-shard-timings.json'),
        'utf8',
      ),
    ) as Record<string, unknown>
    const keys = Object.keys(table)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(key).toMatch(/^\[[\w-]+\] › [\w./-]+\.spec\.ts$/)
      expect(table[key]).toBeTypeOf('number')
    }
  })
})
