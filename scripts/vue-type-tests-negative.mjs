/**
 * Runs vue-tsc on fixtures that must not typecheck. A zero exit code means the
 * negative harness stopped catching invalid consumer code.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const vuePackageRoot = join(root, 'packages', 'vue')

let typecheckFailed = false

try {
  execFileSync(
    'pnpm',
    ['exec', 'vue-tsc', '-p', 'tsconfig.type-tests-negative.json', '--noEmit'],
    {
      cwd: vuePackageRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        COREPACK_HOME: process.env.COREPACK_HOME ?? '/tmp/corepack',
      },
    },
  )
} catch {
  typecheckFailed = true
}

if (!typecheckFailed) {
  console.error(
    'Negative vue type fixtures were expected to fail vue-tsc but passed.',
  )
  process.exit(1)
}
