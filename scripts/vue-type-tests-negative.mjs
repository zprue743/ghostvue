/**
 * Runs vue-tsc on fixtures that must not typecheck. Validates the failure is the
 * expected consumer regression (TS2322 on `modelValue` in the negative fixture),
 * not an incidental tooling or project graph error.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join } from 'node:path'

import { parseVueTscErrorLines } from './lib/vue-type-tests-negative-diagnostics.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const vuePackageRoot = join(root, 'packages', 'vue')

const canonicalTsconfig = 'tsconfig.type-tests-negative.json'
const negativeFixtureSuffix = 'type-tests-negative/invalid-model-value.ts'

const tsconfigArg = process.argv[2] ?? canonicalTsconfig
const isCanonicalHarness = tsconfigArg === canonicalTsconfig
const tsconfigPath = isAbsolute(tsconfigArg)
  ? tsconfigArg
  : join(vuePackageRoot, tsconfigArg)
const vueTscWorkingDir = dirname(tsconfigPath)
const vueTscConfig = isAbsolute(tsconfigArg) ? tsconfigPath : tsconfigArg

function failWithOutput(reason, output) {
  console.error(reason)
  if (output) {
    console.error('vue-tsc output:')
    console.error(output)
  }
  process.exit(1)
}

let result
try {
  try {
    const stdout = execFileSync(
      'pnpm',
      ['exec', 'vue-tsc', '-p', vueTscConfig, '--noEmit'],
      {
        cwd: vueTscWorkingDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    result = { exitCode: 0, output: stdout }
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      console.error('vue-type-tests-negative: could not spawn pnpm or vue-tsc.')
      console.error(error)
      process.exit(1)
    }
    const execError =
      /** @type {Error & { status?: number | null, stdout?: string | Buffer, stderr?: string | Buffer }} */ (
        error
      )
    if (execError.status === null || execError.status === undefined) {
      console.error(
        'vue-type-tests-negative: vue-tsc did not run to completion.',
      )
      console.error(execError)
      process.exit(1)
    }
    const stdout =
      typeof execError.stdout === 'string'
        ? execError.stdout
        : (execError.stdout?.toString() ?? '')
    const stderr =
      typeof execError.stderr === 'string'
        ? execError.stderr
        : (execError.stderr?.toString() ?? '')
    result = { exitCode: execError.status, output: `${stdout}${stderr}` }
  }
} catch (unexpected) {
  console.error('vue-type-tests-negative: unexpected error running vue-tsc.')
  console.error(unexpected)
  process.exit(1)
}

if (result.exitCode === 0) {
  failWithOutput(
    'Negative vue type fixtures were expected to fail vue-tsc but passed.',
    result.output,
  )
}

if (!isCanonicalHarness) {
  process.exit(0)
}

const diagnostics = parseVueTscErrorLines(result.output)

const outsideNegative = diagnostics.filter(
  (diagnostic) => !diagnostic.file.includes('type-tests-negative/'),
)

if (outsideNegative.length > 0) {
  failWithOutput(
    'vue-tsc reported errors outside type-tests-negative fixtures:',
    result.output,
  )
}

const expected = diagnostics.find(
  (diagnostic) =>
    diagnostic.file.endsWith(negativeFixtureSuffix) &&
    diagnostic.code === 'TS2322' &&
    diagnostic.line === '9' &&
    diagnostic.message.includes('number') &&
    diagnostic.message.includes('string'),
)

if (!expected) {
  failWithOutput(
    `Expected ${negativeFixtureSuffix}(9) to report TS2322 on modelValue (number vs string).`,
    result.output,
  )
}
