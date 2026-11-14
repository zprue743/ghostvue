/** @vitest-environment node */

import { execFile } from 'node:child_process'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { ICruiseResult } from 'dependency-cruiser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const fixtureRoot = fileURLToPath(
  new URL('../fixtures/package-boundaries/', import.meta.url),
)
const execFileAsync = promisify(execFile)
const checker = fileURLToPath(
  new URL('../../scripts/check-package-boundaries.mjs', import.meta.url),
)

describe('source import boundaries', () => {
  let workspace: string

  beforeEach(async () => {
    workspace = await mkdtemp(resolve(tmpdir(), 'ghostvue-boundaries-'))
    await cp(resolve(fixtureRoot, 'packages'), resolve(workspace, 'packages'), {
      recursive: true,
    })
    await cp(
      resolve(fixtureRoot, 'tsconfig.json'),
      resolve(workspace, 'tsconfig.json'),
    )
    for (const directory of [
      'apps',
      'examples',
      'tests',
      'scripts',
      'packages/core/src',
    ]) {
      await mkdir(resolve(workspace, directory), { recursive: true })
    }
    // These invalid imports must be ignored by the real file collector.
    for (const directory of ['fixtures', 'dist']) {
      const ignored = resolve(workspace, 'packages/core', directory)
      await mkdir(ignored)
      await cp(
        resolve(fixtureRoot, 'cases/bad-layering.js'),
        resolve(ignored, 'index.js'),
      )
    }
    await mkdir(resolve(workspace, 'node_modules/@ghostvue'), {
      recursive: true,
    })
    // Real package links preserve npm import classification; aliases count as
    // local imports and would trigger the cross-package relative-import rule.
    for (const name of ['shared', 'vue']) {
      await symlink(
        resolve(workspace, 'packages', name),
        resolve(workspace, 'node_modules/@ghostvue', name),
        'junction',
      )
    }
  })

  afterEach(async () => {
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
      const entry = 'packages/core/src/index.js'
      await cp(
        resolve(fixtureRoot, `cases/${fixture}.js`),
        resolve(workspace, entry),
      )
      // A child cwd gives anchored production rules their normal packages/ paths
      // without changing the cwd of other Vitest workers.
      const { stdout } = await execFileAsync(
        process.execPath,
        [resolve(fixtureRoot, 'cruise.mjs'), workspace, entry],
        { cwd: workspace },
      )
      const output = JSON.parse(stdout) as ICruiseResult

      // A skipped fixture or unresolved package must not pass as a clean graph.
      expect(output.modules).toContainEqual(
        expect.objectContaining({ source: target }),
      )
      expect(
        output.modules.flatMap((module) => module.dependencies),
      ).not.toContainEqual(expect.objectContaining({ couldNotResolve: true }))
      const sourceModule = output.modules.find(
        (module) => module.source === entry,
      )
      expect(sourceModule?.dependencies).toContainEqual(
        expect.objectContaining({
          resolved: target,
          couldNotResolve: false,
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

      const check = execFileAsync(process.execPath, [checker, workspace])
      if (rule) {
        await expect(check).rejects.toHaveProperty('code', 1)
        await expect(check).rejects.toHaveProperty(
          'stderr',
          expect.stringContaining(`[${rule}] ${entry} -> ${target}`),
        )
      } else {
        const { stdout, stderr } = await check
        expect(stderr).toBe('')
        expect(stdout).toContain(
          'Package and source import boundaries are valid',
        )
      }
    },
  )

  it('resolves the requested workspace tsconfig from another cwd', async () => {
    const entry = 'packages/core/src/index.js'
    await writeFile(
      resolve(workspace, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: { '@fixture/vue': ['./packages/vue/src/index.js'] },
        },
      }),
    )
    await writeFile(
      resolve(workspace, entry),
      "export { vue } from '@fixture/vue'\n",
    )
    const { stdout } = await execFileAsync(
      process.execPath,
      [resolve(fixtureRoot, 'cruise.mjs'), workspace, entry],
      { cwd: workspace },
    )
    const output = JSON.parse(stdout) as ICruiseResult
    expect(output.summary.violations).toContainEqual(
      expect.objectContaining({
        from: entry,
        to: 'packages/vue/src/index.js',
        rule: { name: 'core-no-vue-or-themes', severity: 'error' },
      }),
    )

    // The fixture directory has its own unrelated tsconfig; the CLI must use
    // the explicit workspace root instead of resolving relative to this cwd.
    const check = execFileAsync(process.execPath, [checker, workspace], {
      cwd: fixtureRoot,
    })
    await expect(check).rejects.toHaveProperty('code', 1)
    await expect(check).rejects.toHaveProperty(
      'stderr',
      expect.stringContaining(
        '[core-no-vue-or-themes] packages/core/src/index.js -> packages/vue/src/index.js',
      ),
    )
  })

  it('rejects forbidden package.json dependencies through the real checker', async () => {
    await cp(
      resolve(fixtureRoot, 'cases/good.js'),
      resolve(workspace, 'packages/core/src/index.js'),
    )
    await writeFile(
      resolve(workspace, 'packages/core/package.json'),
      JSON.stringify({
        name: '@ghostvue/core',
        private: true,
        type: 'module',
        dependencies: { '@ghostvue/vue': '*' },
      }),
    )
    const check = execFileAsync(process.execPath, [checker, workspace])
    await expect(check).rejects.toHaveProperty('code', 1)
    await expect(check).rejects.toHaveProperty(
      'stderr',
      expect.stringContaining('@ghostvue/core may not depend on @ghostvue/vue'),
    )
  })
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
