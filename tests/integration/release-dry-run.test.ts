/** @vitest-environment node */

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  REPOSITORY_URL,
  runReleaseDryRun,
  verifyReleaseEvidence,
} from '../../scripts/lib/release-dry-run.js'
import { execPackageManagerSync } from '../../scripts/lib/package-manager.js'

// End-to-end dry run against a two-package fixture workspace, so the
// pack -> stage -> npm publish --dry-run path is exercised without building
// the real packages. Spawns pnpm/npm/changesets, hence the heavy-integration
// registration in scripts/ci-heavy-integration-tests.mjs.

const root = fileURLToPath(new URL('../..', import.meta.url))
const packages = [
  { directory: 'alpha', name: '@ghostvue/alpha' },
  { directory: 'beta', name: '@ghostvue/beta' },
] as const

let workspace: string

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'ghostvue-release-fixture-'))
  await writeJson(join(workspace, 'package.json'), {
    name: 'fixture-root',
    version: '0.0.0',
    private: true,
  })
  await writeFile(
    join(workspace, 'pnpm-workspace.yaml'),
    'packages:\n  - packages/*\n',
  )
  await mkdir(join(workspace, '.changeset'))
  await writeJson(join(workspace, '.changeset', 'config.json'), {
    changelog: '@changesets/cli/changelog',
    commit: false,
    fixed: [],
    linked: [],
    access: 'public',
    baseBranch: 'master',
    updateInternalDependencies: 'patch',
    ignore: [],
    privatePackages: { version: true, tag: false },
  })
  await writeFile(
    join(workspace, '.changeset', 'first-release.md'),
    "---\n'@ghostvue/alpha': minor\n'@ghostvue/beta': minor\n---\n\nFirst release.\n",
  )
  for (const { directory, name } of packages) {
    const packageDirectory = join(workspace, 'packages', directory)
    await mkdir(join(packageDirectory, 'dist'), { recursive: true })
    await writeFile(join(packageDirectory, 'dist', 'index.js'), 'export {}\n')
    await writeJson(join(packageDirectory, 'package.json'), {
      name,
      version: '0.0.0',
      private: true,
      license: 'MIT',
      repository: {
        type: 'git',
        url: REPOSITORY_URL,
        directory: `packages/${directory}`,
      },
      type: 'module',
      exports: { '.': './dist/index.js' },
      files: ['dist'],
      publishConfig: { access: 'public', provenance: true },
      ...(directory === 'beta'
        ? { dependencies: { '@ghostvue/alpha': 'workspace:*' } }
        : {}),
    })
  }
  // pnpm pack resolves `workspace:*` from installed links; the fixture has no
  // external dependencies, so an offline install only creates those links.
  execPackageManagerSync('pnpm', ['install', '--offline'], {
    cwd: workspace,
    stdio: 'pipe',
  })
})

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true })
})

describe('release dry run', () => {
  it('produces verifiable evidence at the planned version without touching sources', async () => {
    const before = await readFile(
      join(workspace, 'packages', 'beta', 'package.json'),
      'utf8',
    )
    const summary = await runReleaseDryRun({
      root: workspace,
      packages,
      outDir: 'evidence',
      expectVersion: '0.1.0',
    })

    expect(summary.dryRun).toBe(true)
    expect(summary.published).toBe(false)
    expect(summary.packages).toEqual([
      expect.objectContaining({
        name: '@ghostvue/alpha',
        sourcePrivate: true,
        plannedVersion: '0.1.0',
        publishConfig: { access: 'public', provenance: true },
      }),
      expect.objectContaining({
        name: '@ghostvue/beta',
        plannedVersion: '0.1.0',
        dependencies: { '@ghostvue/alpha': '0.1.0' },
      }),
    ])
    // Sources stay private and unversioned; only the scratch copy was bumped.
    expect(
      await readFile(
        join(workspace, 'packages', 'beta', 'package.json'),
        'utf8',
      ),
    ).toBe(before)
    expect(
      await readFile(
        join(workspace, 'evidence', 'changelogs', 'beta.md'),
        'utf8',
      ),
    ).toContain('First release.')

    const evidenceDir = join(workspace, 'evidence')
    await expect(
      verifyReleaseEvidence({ evidenceDir, packages, expectVersion: '0.1.0' }),
    ).resolves.toEqual([])

    await writeFile(
      join(evidenceDir, 'tarballs', 'ghostvue-alpha-0.1.0.tgz'),
      'tampered',
    )
    await expect(
      verifyReleaseEvidence({ evidenceDir, packages, expectVersion: '0.1.0' }),
    ).resolves.toEqual([expect.stringContaining('@ghostvue/alpha tarball')])
  }, 120_000)

  it('fails when the plan does not reach the expected version', async () => {
    await expect(
      runReleaseDryRun({
        root: workspace,
        packages,
        outDir: 'evidence',
        expectVersion: '1.0.0',
      }),
    ).rejects.toThrow(/would release 0\.1\.0, expected 1\.0\.0/)
  }, 120_000)

  it('refuses to dry-run a source manifest that is no longer private', async () => {
    const path = join(workspace, 'packages', 'alpha', 'package.json')
    const manifest = JSON.parse(await readFile(path, 'utf8')) as Record<
      string,
      unknown
    >
    delete manifest.private
    await writeJson(path, manifest)
    await expect(
      runReleaseDryRun({ root: workspace, packages, outDir: 'evidence' }),
    ).rejects.toThrow(/must stay "private": true/)
  })
})

describe('release dry-run CLI', () => {
  it.each([[[]], [['--publish']], [['--dry-run', '--no-dry-run']]])(
    'exits 2 without doing work for %j',
    (args) => {
      const result = spawnSync(
        process.execPath,
        ['scripts/release-dry-run.mjs', ...args],
        { cwd: root, encoding: 'utf8' },
      )
      expect(result.status).toBe(2)
      expect(result.stderr).toContain('REFUSING TO PUBLISH')
    },
  )
})
