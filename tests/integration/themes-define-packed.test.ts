/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

describe('packed @ghostvue/themes/define', () => {
  it('loads from tarballs and runs defineTheme without workspace fallbacks', () => {
    const output = execFileSync(
      'node',
      ['scripts/themes-define-packed-smoke.mjs', '--ensure-built'],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          COREPACK_HOME: process.env.COREPACK_HOME ?? '/tmp/corepack',
        },
      },
    )
    expect(output).toContain('packed smoke passed (acme)')
  }, 180_000)
})
