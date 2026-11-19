/**
 * APG conformance evidence recorded under `accessibility.verification` in
 * component manifests (GHO-42).
 *
 * Three categories stay separate on purpose: automated keyboard tests,
 * manual interaction review, and assistive-technology review. Nothing here
 * derives one category from another, so a green browser run can never read as
 * a screen reader review. See docs/architecture/component-manifest.md.
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, posix } from 'node:path'

import { MANIFEST_PACKAGES } from './component-manifests.js'

/** Playwright project whose results count as automated keyboard evidence. */
export const KEYBOARD_EVIDENCE_PROJECT = 'chromium-e2e'

/** Playwright `testDir`; report locations are relative to it. */
export const KEYBOARD_EVIDENCE_TEST_DIR = 'tests/e2e'

/** First manifest schemaVersion that defines `accessibility.verification`. */
export const VERIFICATION_SCHEMA_VERSION = '1.1.0'

export const VERIFICATION_CATEGORIES = Object.freeze([
  'automatedKeyboard',
  'manual',
  'assistiveTechnology',
])

/** Separator Playwright uses between title path segments. */
export const TITLE_SEPARATOR = ' › '

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function keyboardOf(manifest) {
  const keyboard = isRecord(manifest.accessibility)
    ? manifest.accessibility.keyboard
    : undefined
  return isRecord(keyboard) ? keyboard : {}
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version))
  return match ? match.slice(1).map(Number) : null
}

function atLeast(version, minimum) {
  const actual = parseVersion(version)
  const required = parseVersion(minimum)
  if (!actual || !required) return false
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== required[index])
      return actual[index] > required[index]
  }
  return true
}

/**
 * Returns the verification record with every category present. A manifest
 * without `accessibility.verification` resolves to all categories
 * `not-reviewed`; docs and the future MCP projection must use this instead of
 * inventing their own default. The returned object never aliases the input.
 */
export function resolveVerification(manifest) {
  const recorded = isRecord(manifest.accessibility)
    ? manifest.accessibility.verification
    : undefined
  const source = isRecord(recorded) ? recorded : {}
  const automated = isRecord(source.automatedKeyboard)
    ? source.automatedKeyboard
    : {}
  const review = (category) =>
    isRecord(source[category]) ? source[category] : {}
  return {
    recorded: isRecord(recorded),
    automatedKeyboard: {
      status: automated.status ?? 'not-reviewed',
      keys: structuredClone(isRecord(automated.keys) ? automated.keys : {}),
    },
    manual: {
      status: review('manual').status ?? 'not-reviewed',
      evidence: structuredClone(review('manual').evidence ?? []),
    },
    assistiveTechnology: {
      status: review('assistiveTechnology').status ?? 'not-reviewed',
      evidence: structuredClone(review('assistiveTechnology').evidence ?? []),
    },
  }
}

/**
 * Repository rules the JSON Schema cannot express because they compare fields
 * against each other or against the file system. Schema validation runs
 * separately (`validateManifestSchemas`).
 *
 * @param {Record<string, any>} manifest
 * @param {{ file: string, specExists: (spec: string) => boolean }} options
 */
export function validateVerificationContract(manifest, { file, specExists }) {
  const accessibility = isRecord(manifest.accessibility)
    ? manifest.accessibility
    : {}
  if (!isRecord(accessibility.verification)) return []
  const violations = []
  const verification = accessibility.verification

  if (!atLeast(manifest.schemaVersion, VERIFICATION_SCHEMA_VERSION)) {
    violations.push(
      `${file}: accessibility.verification needs schemaVersion ${VERIFICATION_SCHEMA_VERSION} or later (found ${String(manifest.schemaVersion)})`,
    )
  }

  const automated = isRecord(verification.automatedKeyboard)
    ? verification.automatedKeyboard
    : {}
  const keys = isRecord(automated.keys) ? automated.keys : {}
  if (automated.status === 'passed' || automated.status === 'failed') {
    // Every declared key needs a browser test, and the map cannot drift to
    // keys the contract no longer declares.
    const declared = Object.keys(keyboardOf(manifest))
    for (const key of declared) {
      if (!Object.hasOwn(keys, key)) {
        violations.push(
          `${file}: keyboard key ${JSON.stringify(key)} has no mapped browser test in accessibility.verification.automatedKeyboard.keys`,
        )
      }
    }
    for (const key of Object.keys(keys)) {
      if (!declared.includes(key)) {
        violations.push(
          `${file}: automatedKeyboard maps ${JSON.stringify(key)}, which accessibility.keyboard does not declare`,
        )
      }
    }
  }
  for (const [key, references] of Object.entries(keys)) {
    for (const reference of Array.isArray(references) ? references : []) {
      if (!specExists(reference.spec)) {
        violations.push(
          `${file}: key ${JSON.stringify(key)} references missing spec ${reference.spec}`,
        )
      }
    }
  }

  for (const category of ['manual', 'assistiveTechnology']) {
    const record = isRecord(verification[category])
      ? verification[category]
      : {}
    const evidence = Array.isArray(record.evidence) ? record.evidence : []
    evidence.forEach((entry, index) => {
      // Evidence copied from another component (or the themed wrapper of the
      // same name) would silently attest the wrong contract.
      if (
        entry.component !== manifest.name ||
        entry.package !== manifest.package
      )
        violations.push(
          `${file}: ${category}.evidence[${String(index)}] reviews ${String(entry.component)} (${String(entry.package)}), not ${String(manifest.name)} (${String(manifest.package)})`,
        )
    })
  }
  return violations
}

/** Reads every checked-in manifest of the manifest packages. */
export async function loadRepositoryManifests(
  repositoryRoot,
  packages = MANIFEST_PACKAGES,
) {
  const entries = []
  for (const spec of packages) {
    const directory = join(
      repositoryRoot,
      'packages',
      spec.directory,
      'manifests',
    )
    if (!existsSync(directory)) continue
    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.manifest.json'))
      .sort()
    for (const file of files) {
      entries.push({
        file: posix.join('packages', spec.directory, 'manifests', file),
        manifest: JSON.parse(await readFile(join(directory, file), 'utf8')),
      })
    }
  }
  return entries
}

/** Static contract violations for every manifest entry. */
export function validateRepositoryVerification(repositoryRoot, entries) {
  const specExists = (spec) => existsSync(join(repositoryRoot, spec))
  return entries.flatMap(({ file, manifest }) =>
    validateVerificationContract(manifest, { file, specExists }),
  )
}

function referenceKey(spec, title) {
  return `${spec}\u0000${title}`
}

/**
 * Indexes a Playwright JSON report (from `--reporter=json`, including
 * `merge-reports` output and `--list`) by spec file and title path.
 * File-level suites carry the spec path relative to `testDir`; nested suites
 * are `describe` blocks.
 */
export function indexPlaywrightReport(report) {
  const index = new Map()
  // Top-level suites are files (their title is the path); every nested suite
  // is a describe block whose title belongs to the title path.
  function visit(suite, titles, isFile) {
    const nextTitles =
      !isFile && suite.title ? [...titles, suite.title] : titles
    for (const spec of suite.specs ?? []) {
      const specPath = posix.join(KEYBOARD_EVIDENCE_TEST_DIR, spec.file)
      const key = referenceKey(
        specPath,
        [...nextTitles, spec.title].join(TITLE_SEPARATOR),
      )
      const tests = index.get(key) ?? []
      tests.push(...(spec.tests ?? []))
      index.set(key, tests)
    }
    for (const child of suite.suites ?? []) visit(child, nextTitles, false)
  }
  for (const suite of report.suites ?? []) visit(suite, [], true)
  return index
}

function describeTest(test) {
  const last = test.results?.at(-1)?.status ?? 'not run'
  return `outcome ${String(test.status)}, expected ${String(test.expectedStatus)}, last result ${last}`
}

/** Passed evidence: a real pass, including a pass after a CI retry. */
function passed(test) {
  return (
    test.expectedStatus === 'passed' &&
    (test.status === 'expected' || test.status === 'flaky') &&
    test.results?.at(-1)?.status === 'passed'
  )
}

/** Failed evidence: a known defect marked with `test.fail()` that still fails. */
function failedAsExpected(test) {
  return test.expectedStatus === 'failed' && test.status === 'expected'
}

/**
 * Cross-checks mapped keyboard tests against a Playwright JSON report.
 *
 * `mode: 'results'` reads an executed report: every test behind a `passed`
 * category must have run in the evidence project and passed. A `failed`
 * category needs every mapped test to have run and at least one expected
 * failure, so fixing the defect forces the record back to `passed`.
 *
 * `mode: 'list'` reads `playwright test --list` output, which has no results:
 * it checks only that each reference resolves to a test in the evidence
 * project that is not statically skipped.
 *
 * @param {{ file: string, manifest: Record<string, any> }[]} entries
 * @param {unknown} report
 * @param {{ mode: 'list' | 'results' }} options
 */
export function checkKeyboardEvidence(entries, report, { mode }) {
  const violations = []
  const index = indexPlaywrightReport(isRecord(report) ? report : {})
  const evidenceTests = [...index.values()]
    .flat()
    .filter((test) => test.projectName === KEYBOARD_EVIDENCE_PROJECT)
  if (evidenceTests.length === 0) {
    return [
      `Playwright report has no ${KEYBOARD_EVIDENCE_PROJECT} tests; keyboard evidence cannot be verified`,
    ]
  }

  for (const { file, manifest } of entries) {
    const { automatedKeyboard } = resolveVerification(manifest)
    const { status, keys } = automatedKeyboard
    if (status !== 'passed' && status !== 'failed') continue
    let expectedFailures = 0
    for (const [key, references] of Object.entries(keys)) {
      for (const reference of references) {
        const label = `${file}: key ${JSON.stringify(key)} → ${reference.spec} › ${reference.title}`
        const tests = (
          index.get(referenceKey(reference.spec, reference.title)) ?? []
        ).filter((test) => test.projectName === KEYBOARD_EVIDENCE_PROJECT)
        if (tests.length === 0) {
          violations.push(
            `${label}: not found in the ${KEYBOARD_EVIDENCE_PROJECT} ${mode === 'results' ? 'results (the test did not run or does not exist)' : 'test list'}`,
          )
          continue
        }
        for (const test of tests) {
          if (mode === 'list') {
            if (status === 'passed' && test.expectedStatus !== 'passed')
              violations.push(
                `${label}: test is expected to ${String(test.expectedStatus)}, not pass`,
              )
            if (test.expectedStatus === 'skipped')
              violations.push(`${label}: test is skipped`)
            if (test.expectedStatus === 'failed') expectedFailures += 1
            continue
          }
          if (status === 'passed' && !passed(test)) {
            violations.push(`${label}: did not pass (${describeTest(test)})`)
          }
          if (status === 'failed') {
            if (test.status === 'skipped' || !test.results?.length)
              violations.push(`${label}: did not run (${describeTest(test)})`)
            if (failedAsExpected(test)) expectedFailures += 1
          }
        }
      }
    }
    if (status === 'failed' && expectedFailures === 0) {
      violations.push(
        `${file}: automatedKeyboard is "failed" but no mapped test is an expected failure (test.fail()); record "passed" once the defect is fixed`,
      )
    }
  }
  return violations
}
