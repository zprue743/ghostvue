/**
 * Checks component specifications under `docs/components/*-spec.md`.
 *
 * Validates YAML frontmatter, approval status, required-section applicability,
 * unresolved questions, manifest references, and coverage of all exported
 * Ghost* components.
 */
import { fileURLToPath } from 'node:url'

import { checkComponentSpecs } from './lib/component-specs.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const result = await checkComponentSpecs(repositoryRoot)

if (!result.ok) {
  console.error(result.violations.join('\n'))
  console.error(
    `\nSpec check failed with ${String(result.violations.length)} violation(s) across ${String(result.specCount)} spec(s) (${String(result.approvedCount)} approved, ${String(result.exportedCount)} exported components).`,
  )
  process.exitCode = 1
} else {
  console.log(
    `Component specifications valid (${String(result.specCount)} specs, ${String(result.exportedCount)} exported components covered).`,
  )
}
