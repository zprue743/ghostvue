/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

describe('packed @ghostvue/themes/define', () => {
  it('loads from tarballs and runs defineTheme without workspace fallbacks', async () => {
    const before = new Set(
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith('ghostvue-themes-'),
      ),
    )

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

    const leaked = (await readdir(tmpdir())).filter(
      (name) => name.startsWith('ghostvue-themes-') && !before.has(name),
    )
    expect(leaked).toEqual([])
  }, 180_000)
})
