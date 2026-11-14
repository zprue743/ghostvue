/** @vitest-environment node */

import { execFileSync } from 'node:child_process'

import { describe, it } from 'vitest'

const repositoryRoot = process.cwd()

const execEnv = {
  ...process.env,
  COREPACK_HOME: process.env.COREPACK_HOME ?? '/tmp/corepack',
}

describe('vue consumer type tests', () => {
  it('runs positive and negative vue-tsc consumer harnesses', () => {
    execFileSync('pnpm', ['--filter', '@ghostvue/vue', 'typecheck'], {
      cwd: repositoryRoot,
      stdio: 'pipe',
      env: execEnv,
    })
  }, 60_000)
})
