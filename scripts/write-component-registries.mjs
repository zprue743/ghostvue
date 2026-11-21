/**
 * Writes or checks shared registries generated from packages/vue/registry/*.json.
 */
import { fileURLToPath } from 'node:url'

import { syncRepositoryRegistries } from './lib/component-registries.js'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const writeMode = process.argv.includes('--write')

if (writeMode && process.env.GHOSTVUE_REGISTRIES_READY === '1') {
  // CI sets GHOSTVUE_REGISTRIES_READY=1 inside verify:static / verify:build
  // after pnpm install (prepare) already generated registries, skipping repeated
  // pretypecheck/prebuild rewrites while check mode still verifies everything.
  process.exit(0)
}

const result = await syncRepositoryRegistries({
  repositoryRoot,
  write: writeMode,
})

if (result.violations.length > 0) {
  console.error(result.violations.join('\n'))
  if (!writeMode) {
    console.error('\nRegenerate registries with: pnpm registries:write')
  }
  process.exitCode = 1
} else if (writeMode) {
  const count = result.written.length
  console.log(
    count === 0
      ? 'No registry outputs written.'
      : `Wrote ${String(count)} registry artifact${count === 1 ? '' : 's'}.`,
  )
} else {
  const checked = result.checked.length
  console.log(
    checked === 0
      ? 'No generated registries to check.'
      : `Registries match metadata (${String(checked)} artifacts).`,
  )
}
