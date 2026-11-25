/**
 * Duration-balanced sharding for the Chromium `browser-shard` matrix (GHO-254).
 *
 * Playwright's `--shard` splits the ordered test list into equal test counts.
 * The `chromium` project holds hundreds of cheap screenshot tests while the
 * heavy docs/example specs sit in `chromium-e2e`, so equal counts left one CI
 * shard doing ~1.6x the other's work. Here each shard unit is one project's
 * tests in one spec file, costed from measured per-test durations, and units
 * are packed onto shards with a deterministic longest-processing-time greedy.
 *
 * Every matrix job computes the same plan from the same `--list` output and
 * timing table, so the shards are disjoint and together cover every listed
 * test. Units with no recorded timing (new spec files) are costed at the
 * project's median per-test duration, so the plan never drops a test and only
 * degrades gracefully until the timing table is refreshed.
 */

/** Separator used in timing keys and Playwright `--test-list` lines. */
const SEPARATOR = ' › '

/**
 * Fallback per-test cost when a project has no recorded timings at all.
 * Roughly a typical `chromium-e2e` test on a CI runner.
 */
export const DEFAULT_TEST_MS = 2000

/**
 * @typedef {{ project: string, file: string }} ListedTest
 * @typedef {{ key: string, project: string, file: string, tests: number, estimatedMs: number }} ShardUnit
 * @typedef {{ units: ShardUnit[], estimatedMs: number, tests: number }} Shard
 */

/**
 * @param {string} project
 * @param {string} file
 * @returns {string}
 */
export function unitKey(project, file) {
  return `[${project}]${SEPARATOR}${file}`
}

/**
 * Walks a Playwright JSON report (from `--list` or a real run) and yields each
 * test with its project, spec file (relative to `testDir`), and final status.
 *
 * @param {unknown} report
 * @returns {Array<ListedTest & { durationMs: number, status: string | undefined }>}
 */
export function collectReportTests(report) {
  /** @type {Array<ListedTest & { durationMs: number, status: string | undefined }>} */
  const tests = []
  /** @param {any} suite */
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const results = Array.isArray(test.results) ? test.results : []
        tests.push({
          project: String(test.projectName),
          file: String(spec.file),
          // Retries are real shard time, so cost every attempt.
          durationMs: results.reduce(
            (/** @type {number} */ total, /** @type {any} */ result) =>
              total + (Number(result.duration) || 0),
            0,
          ),
          status: test.status,
        })
      }
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  const root = /** @type {{ suites?: unknown[] }} */ (report)
  for (const suite of root.suites ?? []) walk(suite)
  return tests
}

/**
 * Builds the committed timing table (mean milliseconds per test, keyed by
 * project and spec file) from a Playwright JSON report of a full run.
 *
 * Only tests that ended `expected` or `flaky` are measured when a unit has
 * any: a failing screenshot or a timed-out test runs much longer than a
 * passing one and would skew the plan. Units where nothing passed fall back
 * to every attempt so they still get a cost.
 *
 * @param {unknown} report
 * @returns {Record<string, number>}
 */
export function buildTimingTable(report) {
  /** @type {Map<string, { passed: number[], all: number[] }>} */
  const byUnit = new Map()
  for (const test of collectReportTests(report)) {
    const key = unitKey(test.project, test.file)
    const entry = byUnit.get(key) ?? { passed: [], all: [] }
    entry.all.push(test.durationMs)
    if (test.status === 'expected' || test.status === 'flaky') {
      entry.passed.push(test.durationMs)
    }
    byUnit.set(key, entry)
  }

  /** @type {Record<string, number>} */
  const table = {}
  for (const key of [...byUnit.keys()].sort()) {
    const entry = /** @type {{ passed: number[], all: number[] }} */ (
      byUnit.get(key)
    )
    const samples = entry.passed.length > 0 ? entry.passed : entry.all
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    table[key] = Math.max(1, Math.round(mean))
  }
  return table
}

/**
 * @param {number[]} values
 * @returns {number | undefined}
 */
function median(values) {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Groups listed tests into project/file units and estimates each unit's cost.
 *
 * @param {ListedTest[]} tests
 * @param {Record<string, number>} timings mean ms per test, keyed by `unitKey`
 * @returns {ShardUnit[]}
 */
export function buildUnits(tests, timings) {
  /** @type {Map<string, ShardUnit>} */
  const units = new Map()
  for (const { project, file } of tests) {
    const key = unitKey(project, file)
    const unit = units.get(key) ?? {
      key,
      project,
      file,
      tests: 0,
      estimatedMs: 0,
    }
    unit.tests += 1
    units.set(key, unit)
  }

  /** @type {Map<string, number[]>} */
  const perProject = new Map()
  for (const [key, ms] of Object.entries(timings)) {
    const project = /^\[(.+?)\]/.exec(key)?.[1]
    if (!project || !Number.isFinite(ms) || ms <= 0) continue
    perProject.set(project, [...(perProject.get(project) ?? []), ms])
  }

  for (const unit of units.values()) {
    const recorded = timings[unit.key]
    const perTest =
      Number.isFinite(recorded) && recorded > 0
        ? recorded
        : (median(perProject.get(unit.project) ?? []) ?? DEFAULT_TEST_MS)
    unit.estimatedMs = Math.round(perTest * unit.tests)
  }
  return [...units.values()]
}

/**
 * Packs units onto `total` shards, heaviest first, always onto the currently
 * lightest shard (lowest index on ties). Sorting ties by key keeps the plan
 * identical in every matrix job.
 *
 * @param {ShardUnit[]} units
 * @param {number} total
 * @returns {Shard[]}
 */
export function planShards(units, total) {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error(`Shard total must be a positive integer, got ${total}`)
  }
  /** @type {Shard[]} */
  const shards = Array.from({ length: total }, () => ({
    units: [],
    estimatedMs: 0,
    tests: 0,
  }))
  const ordered = [...units].sort(
    (a, b) =>
      b.estimatedMs - a.estimatedMs ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  )
  for (const unit of ordered) {
    let target = shards[0]
    for (const shard of shards) {
      if (shard.estimatedMs < target.estimatedMs) target = shard
    }
    target.units.push(unit)
    target.estimatedMs += unit.estimatedMs
    target.tests += unit.tests
  }
  for (const shard of shards) {
    shard.units.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  }
  return shards
}

/**
 * Parses `current/total` (1-based), matching Playwright's `--shard` syntax.
 *
 * @param {string} value
 * @returns {{ current: number, total: number }}
 */
export function parseShardArg(value) {
  const match = /^(\d+)\/(\d+)$/.exec(value)
  const current = Number(match?.[1])
  const total = Number(match?.[2])
  if (!match || total < 1 || current < 1 || current > total) {
    throw new Error(
      `Expected --shard=<current>/<total> with 1 <= current <= total, got "${value}"`,
    )
  }
  return { current, total }
}

/**
 * Renders a shard as a Playwright `--test-list` file: one
 * `[project] › file` line per unit, which selects every test of that project
 * in that file.
 *
 * @param {Shard} shard
 * @returns {string}
 */
export function formatTestList(shard) {
  return shard.units.map((unit) => `${unit.key}\n`).join('')
}
