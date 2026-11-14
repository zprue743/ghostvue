/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
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
    'apps/docs',
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

function run(root: string, args: string[]) {
  try {
    // Full-repo verify in a copied workspace can exceed four minutes as packages grow.
    execFileSync('pnpm', args, { cwd: root, stdio: 'pipe', timeout: 480_000 })
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
        expect(relative(root, join(root, path))).toBe(path)
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
      const nav = await readFile(
        join(root, 'apps/docs/.vitepress/docs-nav.ts'),
        'utf8',
      )
      const contributing = nav
        .split("text: 'Contributing',")[1]
        ?.split("text: 'AI agents',")[0]
      expect(contributing).toContain("text: 'GhostScaffoldProbe specification'")
      expect(contributing).toContain("link: '/components/scaffold-probe-spec'")
      run(root, ['verify'])
      await expect(
        scaffoldComponent(root, 'GhostScaffoldProbe'),
      ).rejects.toThrow('Refusing to overwrite')
      await expect(scaffoldComponent(root, 'Button')).rejects.toThrow(
        'Refusing to overwrite',
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 360_000)
})
