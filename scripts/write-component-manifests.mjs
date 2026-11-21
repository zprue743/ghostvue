/**
 * Writes or checks machine-readable component manifests.
 *
 * `--write` refreshes `*.manifest.json` from `Ghost*.vue` sources. The default
 * check mode fails when a checked-in manifest is stale, matching
 * `pnpm adapters`.
 */
import { fileURLToPath } from 'node:url'

import {
  loadRepositoryManifests,
  validateRepositoryVerification,
} from './lib/accessibility-verification.js'
import {
  syncRepositoryManifests,
  validateExampleManifests,
} from './lib/component-manifests.js'
import { validateRepositoryStatus } from './lib/component-status.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const writeMode = process.argv.includes('--write')

const result = await syncRepositoryManifests({
  repositoryRoot,
  write: writeMode,
})
const exampleViolations = await validateExampleManifests(repositoryRoot)
// Cross-field accessibility.verification rules (declared keys vs mapped
// tests, evidence identity, schemaVersion). Execution is checked separately
// by scripts/check-keyboard-evidence.mjs.
const repositoryManifests = await loadRepositoryManifests(repositoryRoot)
const verificationViolations = validateRepositoryVerification(
  repositoryRoot,
  repositoryManifests,
)
// Stability policy (docs/standards/component-stability.md): a declared beta or
// stable status must be backed by the recorded spec, docs, and review
// evidence. The check rejects a status; it never infers or promotes one.
const statusViolations = validateRepositoryStatus(
  repositoryRoot,
  repositoryManifests,
)
const violations = [
  ...result.violations,
  ...exampleViolations,
  ...verificationViolations,
  ...statusViolations,
]

if (violations.length > 0) {
  console.error(violations.join('\n'))
  if (!writeMode) {
    console.error('\nRegenerate manifests with: pnpm manifests:write')
    console.error(
      'Fill descriptions, styling, accessibility, and examples in the manifest; those prose fields are preserved on the next write.',
    )
  }
  process.exitCode = 1
} else if (writeMode) {
  const count = result.written.length
  console.log(
    count === 0
      ? 'No Ghost*.vue components to generate manifests for.'
      : `Wrote ${String(count)} component manifest${count === 1 ? '' : 's'}.`,
  )
} else {
  const generated = result.checked.length
  console.log(
    generated === 0
      ? 'No generated component manifests to check.'
      : `Component manifests match Vue sources (${String(generated)} generated).`,
  )
  console.log('Example files match manifest example ids.')
}
