/** @vitest-environment node */

import { existsSync } from 'node:fs'
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  componentIdentity,
  scaffoldComponent,
} from '../../scripts/lib/new-component.js'
import { execPackageManagerSync } from '../../scripts/lib/package-manager.js'

const repositoryRoot = process.cwd()

async function copyRepository() {
  const root = await mkdtemp(join(tmpdir(), 'ghost-scaffold-'))
  await cp(repositoryRoot, root, {
    recursive: true,
    filter: (source) =>
      ![
        'node_modules',
        '.git',
        'dist',
        'coverage',
        'reports',
        'test-results',
        'playwright-report',
        // Nuxt fixture build output (pnpm test:nuxt).
        '.nuxt',
        '.output',
      ].includes(basename(source)) &&
      !source.endsWith('.tsbuildinfo') &&
      // Avoid recursively invoking this harness inside the fixture's verify.
      source !==
        join(repositoryRoot, 'tests/integration/new-component.test.ts'),
  })
  // Reuse installed tooling without fetching dependencies or touching the repo.
  for (const directory of [
    '',
    'packages/vue',
    'packages/themes',
    'packages/core',
    'packages/shared',
    'packages/nuxt',
    'packages/eslint-plugin',
    'apps/docs',
    'apps/nuxt-fixture',
    'apps/playground',
  ]) {
    if (!existsSync(join(repositoryRoot, directory, 'node_modules'))) continue
    const modules = join(root, directory, 'node_modules')
    await mkdir(modules, { recursive: true })
    for (const entry of await readdir(
      join(repositoryRoot, directory, 'node_modules'),
    )) {
      // Task state belongs to the temporary workspace, never the real install.
      if (
        entry.includes('workspace-state') ||
        entry.startsWith('.pnpm-task-') ||
        entry === '.cache'
      )
        continue
      if (entry === '@ghostvue') {
        await mkdir(join(modules, entry))
        for (const dependency of await readdir(
          join(repositoryRoot, directory, 'node_modules', entry),
        )) {
          const target = await realpath(
            join(repositoryRoot, directory, 'node_modules', entry, dependency),
          )
          await symlink(
            join(root, relative(repositoryRoot, target)),
            join(modules, entry, dependency),
            'dir',
          )
        }
      } else {
        await symlink(
          join(repositoryRoot, directory, 'node_modules', entry),
          join(modules, entry),
        )
      }
    }
  }
  return root
}

function run(root: string, args: string[], extraEnv?: Record<string, string>) {
  // Vitest sets NODE_ENV=test. Inherited by the nested `pnpm verify`, it makes
  // @vitejs/plugin-vue compile SFCs in development mode, so `pnpm size` would
  // measure a non-production package build. Run the gate as a shell would.
  const env = { ...process.env, ...extraEnv }
  delete env.NODE_ENV
  try {
    // Full-repo verify in a copied workspace grows with every package and test:
    // under coverage on CI runners it now passes eight minutes once @ghostvue/nuxt
    // joined the workspace. Stay inside the 15-minute verify-integration job limit.
    execPackageManagerSync('pnpm', args, {
      cwd: root,
      env,
      stdio: 'pipe',
      timeout: 720_000,
    })
  } catch (error) {
    if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
      throw new Error(
        `${args.join(' ')} failed:\n${String(error.stdout)}\n${String(error.stderr)}`,
        { cause: error },
      )
    }
    throw error
  }
}

describe('component scaffolding', () => {
  it('normalizes Ghost prefixes and rejects unsafe or non-PascalCase names', () => {
    expect(componentIdentity('ScaffoldProbe')).toEqual({
      name: 'GhostScaffoldProbe',
      suffix: 'ScaffoldProbe',
      slug: 'scaffold-probe',
    })
    expect(componentIdentity('GhostScaffoldProbe')).toEqual(
      componentIdentity('ScaffoldProbe'),
    )
    expect(componentIdentity('RadioGroup').slug).toBe('radio-group')
    for (const name of [
      '',
      'scaffold-probe',
      'X',
      'Ghost',
      '../ScaffoldProbe',
      'ScaffoldProbe.vue',
      'ScaffoldProbe-Group',
      'ScaffoldProbe;exit',
    ]) {
      expect(() => componentIdentity(name)).toThrow()
    }
  })

  it('refuses partial collisions without touching existing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-collision-'))
    try {
      const path = join(root, 'packages/vue/src/ghost-scaffold-probe.ts')
      await mkdir(join(root, 'packages/vue/src'), { recursive: true })
      await writeFile(path, 'consumer work')
      await expect(scaffoldComponent(root, 'ScaffoldProbe')).rejects.toThrow(
        'Refusing to overwrite',
      )
      expect(await readFile(path, 'utf8')).toBe('consumer work')
      await expect(
        readFile(join(root, 'packages/vue/src/GhostScaffoldProbe.vue')),
      ).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('scaffolds a complete, formatted component that passes pnpm verify unmodified', async () => {
    const root = await copyRepository()
    try {
      const before = await readFile(
        join(root, 'packages/vue/src/index.ts'),
        'utf8',
      )
      const dryRun = await scaffoldComponent(root, 'ScaffoldProbe', {
        dryRun: true,
      })
      expect(
        await readFile(join(root, 'packages/vue/src/index.ts'), 'utf8'),
      ).toBe(before)
      await expect(
        readFile(join(root, 'packages/vue/src/GhostScaffoldProbe.vue')),
      ).rejects.toThrow()
      const result = await scaffoldComponent(root, 'ScaffoldProbe')
      expect(result.created).toEqual(dryRun.created)
      expect(result.updated).toEqual(dryRun.updated)
      const paths = [...result.created, ...result.updated]
      for (const path of paths)
        expect(relative(root, join(root, path)).replaceAll('\\', '/')).toBe(
          path,
        )
      expect(result.created).toContain(
        'tests/integration/ghost-scaffold-probe-themed.test.ts',
      )
      for (const pkg of ['vue', 'themes']) {
        const manifest: unknown = JSON.parse(
          await readFile(
            join(
              root,
              `packages/${pkg}/manifests/ghost-scaffold-probe.manifest.json`,
            ),
            'utf8',
          ),
        )
        expect(manifest).toHaveProperty('exposed', [
          {
            name: 'element',
            kind: 'property',
            type: 'HTMLElement | null',
            description: 'Root element after mount; null before mount.',
          },
        ])
      }
      const familyRegistry: unknown = JSON.parse(
        await readFile(
          join(root, 'packages/vue/registry/scaffold-probe.registry.json'),
          'utf8',
        ),
      )
      expect(familyRegistry).toMatchObject({
        docs: {
          title: 'GhostScaffoldProbe',
          category: 'utilities',
          sidebarLabel: 'Scaffold Probe',
          specLink: '/specs/scaffold-probe',
        },
        examples: [{ id: 'scaffold-probe/basic' }],
      })
      expect(result.updated).toContain('scripts/bundle-size-budgets.json')
      const budgets: unknown = JSON.parse(
        await readFile(join(root, 'scripts/bundle-size-budgets.json'), 'utf8'),
      )
      expect(budgets).toMatchObject({
        '@ghostvue/vue:GhostScaffoldProbe': 2000,
        '@ghostvue/themes:GhostScaffoldProbe': 2000,
      })
      run(root, ['registries:write'])
      if (process.env.RUN_FULL_SCAFFOLD_VERIFY === '1') {
        run(root, ['verify'])
      } else {
        // Normal runs validate every file and contract the scaffold touches
        // without re-running the entire repository's test/docs suites. Set
        // RUN_FULL_SCAFFOLD_VERIFY=1 (used on scaffolding changes and weekly
        // CI) to run the full nested `pnpm verify` in the copied workspace.
        const touchedFiles = [...result.created, ...result.updated]
        const lintFiles = touchedFiles.filter((file) =>
          /\.(?:ts|tsx|mts|js|mjs|cjs|vue)$/u.test(file),
        )
        const prettierFiles = touchedFiles.filter(
          (file) => !file.endsWith('.manifest.json'),
        )
        const scaffoldTestFiles = result.created.filter((file) =>
          file.endsWith('.test.ts'),
        )
        expect(lintFiles.length).toBeGreaterThan(0)
        expect(prettierFiles.length).toBeGreaterThan(0)
        expect(scaffoldTestFiles.length).toBeGreaterThanOrEqual(2)

        const targetedEnv = { GHOSTVUE_REGISTRIES_READY: '1' }
        run(
          root,
          ['exec', 'eslint', '--max-warnings=0', ...lintFiles],
          targetedEnv,
        )
        run(
          root,
          [
            'exec',
            'prettier',
            '--check',
            '--ignore-path',
            '.prettierignore',
            ...prettierFiles,
          ],
          targetedEnv,
        )
        run(root, ['boundaries'], targetedEnv)
        run(root, ['adapters'], targetedEnv)
        run(root, ['manifests'], targetedEnv)
        run(root, ['specs:check'], targetedEnv)
        run(
          root,
          [
            '--filter',
            '@ghostvue/vue',
            '--filter',
            '@ghostvue/themes',
            '--filter',
            '@ghostvue/nuxt',
            '--filter',
            '@ghostvue/docs',
            '--filter',
            '@ghostvue/playground',
            'typecheck',
          ],
          targetedEnv,
        )
        run(root, ['exec', 'vitest', 'run', ...scaffoldTestFiles], targetedEnv)
        run(root, ['build'], targetedEnv)
        run(root, ['published-exports'], targetedEnv)
      }
      await expect(
        scaffoldComponent(root, 'GhostScaffoldProbe'),
      ).rejects.toThrow('Refusing to overwrite')
      await expect(scaffoldComponent(root, 'Button')).rejects.toThrow(
        'Refusing to overwrite',
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 720_000)
})
