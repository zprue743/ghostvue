/** @vitest-environment node */

import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { ICruiseResult } from 'dependency-cruiser'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixtureRoot = fileURLToPath(
  new URL('../fixtures/package-boundaries/', import.meta.url),
)
const execFileAsync = promisify(execFile)

describe('source import boundaries', () => {
  let workspace: string

  beforeAll(async () => {
    workspace = await mkdtemp(resolve(tmpdir(), 'ghostvue-boundaries-'))
    await cp(resolve(fixtureRoot, 'packages'), resolve(workspace, 'packages'), {
      recursive: true,
    })
    await mkdir(resolve(workspace, 'node_modules/@ghostvue'), {
      recursive: true,
    })
    // Real package links preserve npm import classification; aliases count as
    // local imports and would trigger the cross-package relative-import rule.
    for (const name of ['shared', 'vue']) {
      await symlink(
        resolve(workspace, 'packages', name),
        resolve(workspace, 'node_modules/@ghostvue', name),
        'dir',
      )
    }
  })

  afterAll(async () => {
    if (workspace) await rm(workspace, { recursive: true, force: true })
  })

  it.each([
    ['bad-layering', 'packages/vue/src/index.js', 'core-no-vue-or-themes'],
    [
      'bad-relative',
      'packages/shared/src/index.js',
      'no-cross-package-relative-src',
    ],
    ['good', 'packages/shared/src/index.js', undefined],
  ])(
    'checks the %s fixture with production rules',
    async (fixture, target, rule) => {
      const entry = `packages/core/src/${fixture}.js`
      // A child cwd gives anchored production rules their normal packages/ paths
      // without changing the cwd of other Vitest workers.
      const { stdout } = await execFileAsync(
        process.execPath,
        [resolve(fixtureRoot, 'cruise.mjs'), entry],
        { cwd: workspace },
      )
      const output = JSON.parse(stdout) as ICruiseResult

      // A skipped fixture or unresolved package must not pass as a clean graph.
      expect(output.summary.totalCruised).toBe(2)
      expect(output.summary.totalDependenciesCruised).toBe(1)
      expect(output.modules).toContainEqual(
        expect.objectContaining({
          source: entry,
          dependencies: [
            expect.objectContaining({
              resolved: target,
              couldNotResolve: false,
            }),
          ],
        }),
      )
      expect(output.summary.violations).toEqual(
        rule
          ? [
              expect.objectContaining({
                from: entry,
                to: target,
                rule: { name: rule, severity: 'error' },
              }),
            ]
          : [],
      )
    },
  )
})

describe('workspace metadata', () => {
  it('keeps the Vue runtime external to the published Vue package', async () => {
    const packageJson = JSON.parse(
      await readFile(
        resolve(process.cwd(), 'packages/vue/package.json'),
        'utf8',
      ),
    ) as { peerDependencies?: Record<string, string> }

    // This protects consumers from accidentally receiving a duplicate Vue
    // runtime, which would break identity-sensitive reactivity behavior.
    expect(packageJson.peerDependencies?.['vue']).toBeDefined()
  })

  it('keeps Cursor from reading node_modules and env files', async () => {
    const cursorignore = await readFile(
      resolve(process.cwd(), '.cursorignore'),
      'utf8',
    )

    // .cursorignore is the hard block. Lockfiles and generated outputs stay
    // readable via .cursorindexingignore because tests and reviews open them.
    expect(cursorignore).toMatch(/node_modules/)
    expect(cursorignore).toMatch(/\.env/)
  })
})
