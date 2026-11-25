/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

// GHO-232: pack @ghostvue/mcp, install it with production dependencies only,
// gate the installed size, and drive `ghostvue-mcp` over stdio. CI runs the
// same script in `verify-build` (`pnpm verify:build`), so this file is listed
// in ciBuildCoveredIntegrationTestFiles.
describe('packed @ghostvue/mcp', () => {
  it('ships dist/ only, fits 18 MiB installed, and answers every tool over stdio', async () => {
    const before = new Set(
      (await readdir(tmpdir())).filter((name) =>
        name.startsWith('ghostvue-mcp-packed-'),
      ),
    )

    const output = execFileSync(
      'node',
      ['scripts/mcp-packed-smoke.mjs', '--ensure-built'],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '' },
      },
    )
    expect(output).toMatch(/Packed ghostvue-mcp-\S+\.tgz: \d+ entries/)
    expect(output).toContain('Within budget')
    expect(output).toContain(
      'listed get_component, get_examples, get_tokens, list_components, search_docs',
    )
    expect(output).toContain(
      'called list_components, get_component, get_examples, search_docs, get_tokens',
    )

    const leaked = (await readdir(tmpdir())).filter(
      (name) => name.startsWith('ghostvue-mcp-packed-') && !before.has(name),
    )
    expect(leaked).toEqual([])
  }, 300_000)
})
