/**
 * Verifies the automated keyboard evidence in component manifests (GHO-42).
 *
 * Default (list) mode, part of `pnpm verify:static`: every key in
 * `accessibility.keyboard` of a manifest whose `automatedKeyboard` status is
 * `passed` or `failed` maps to a browser test, and each mapped test exists in
 * the `chromium-e2e` project and is not statically skipped. It needs no
 * browser and no build because it uses `playwright test --list`.
 *
 * `--report <file>` mode, run by the CI `browser` job on the merged Playwright
 * JSON report: each mapped test must have executed and passed (or, for a
 * `failed` record, failed as a declared expected failure). A test name that
 * merely exists in source is never enough.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  checkKeyboardEvidence,
  KEYBOARD_EVIDENCE_PROJECT,
  loadRepositoryManifests,
  validateRepositoryVerification,
} from './lib/accessibility-verification.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const reportFlag = process.argv.indexOf('--report')
const reportPath = reportFlag === -1 ? null : process.argv[reportFlag + 1]

if (reportFlag !== -1 && !reportPath) {
  console.error(
    'Usage: node scripts/check-keyboard-evidence.mjs [--report <playwright-json-report>]',
  )
  process.exit(2)
}

function listReport() {
  const require = createRequire(import.meta.url)
  const cli = require.resolve('@playwright/test/cli')
  const directory = mkdtempSync(join(tmpdir(), 'ghost-keyboard-evidence-'))
  const output = join(directory, 'list.json')
  try {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'test',
        '--list',
        '--reporter=json',
        `--project=${KEYBOARD_EVIDENCE_PROJECT}`,
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: output },
      },
    )
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout)
      throw new Error('playwright test --list failed')
    }
    return JSON.parse(readFileSync(output, 'utf8'))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const entries = await loadRepositoryManifests(repositoryRoot)
const staticViolations = validateRepositoryVerification(repositoryRoot, entries)
const mode = reportPath ? 'results' : 'list'
const report = reportPath
  ? JSON.parse(readFileSync(reportPath, 'utf8'))
  : listReport()
const violations = [
  ...staticViolations,
  ...checkKeyboardEvidence(entries, report, { mode }),
]

const recorded = entries.filter(({ manifest }) =>
  ['passed', 'failed'].includes(
    manifest.accessibility?.verification?.automatedKeyboard?.status,
  ),
)

if (violations.length > 0) {
  console.error(violations.join('\n'))
  console.error(
    '\nMap every declared key to a chromium-e2e test that presses it, or record automatedKeyboard as not-reviewed. See docs/architecture/component-manifest.md#accessibility-verification.',
  )
  process.exitCode = 1
} else {
  console.log(
    mode === 'results'
      ? `Keyboard evidence executed and passed for ${String(recorded.length)} manifest(s).`
      : `Keyboard evidence resolves to ${KEYBOARD_EVIDENCE_PROJECT} tests for ${String(recorded.length)} manifest(s).`,
  )
}
