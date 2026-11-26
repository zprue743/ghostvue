/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

// GHO-217: install the packed publishable tarballs into Vite, Nuxt, and ESLint
// consumers outside the monorepo. CI runs the same script in `verify-build`
// (`pnpm verify:build`), so this file is listed in
// ciBuildCoveredIntegrationTestFiles.
describe('packed consumer smoke', () => {
  it('builds, mounts, server-renders, and lints against the packed tarballs', async () => {
    const before = new Set(
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith('ghostvue-consumer-packed-'),
      ),
    )

    const output = execFileSync(
      'node',
      ['scripts/consumer-packed-smoke.mjs', '--ensure-built'],
      { cwd: root, encoding: 'utf8' },
    )
    expect(output).toContain(
      'Vite + Vue consumer: production build of the documented setup emitted @layer ghostvue-theme base and calm CSS; mounted Field, Input, Select, Dialog, Drawer, and Toast in jsdom.',
    )
    expect(output).toContain(
      'Nuxt consumer: headless auto-imports built and server-rendered; themed opt-in resolves to @ghostvue/themes.',
    )
    expect(output).toContain(
      'ESLint consumer: invalid Ghost* usage flagged by all three rules; valid usage passes.',
    )

    const leaked = (await readdir(tmpdir())).filter(
      (name) =>
        name.startsWith('ghostvue-consumer-packed-') && !before.has(name),
    )
    expect(leaked).toEqual([])
  }, 600_000)
})
