/** @vitest-environment node */

import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  classifyChangedPaths,
  isExecutableMarkdown,
  isHeavySkipEligible,
  stripMarkdownCode,
} from '../../scripts/lib/ci-changed-paths.js'

const repositoryRoot = process.cwd()
const cliScriptPath = resolve(repositoryRoot, 'scripts/ci-changed-paths.mjs')

function readRepoDoc(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8')
}

describe('ci-changed-paths classifier', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  describe('isExecutableMarkdown', () => {
    it('returns false for prose-only markdown and mentions inside code', () => {
      const prose = [
        '# Guide',
        '',
        'Use `<script setup lang="ts">` and `<style>` in SFCs.',
        'Also mention `<GhostExample id="button/basic" />` inline.',
        '',
        '```vue',
        '<script setup lang="ts">',
        'import { GhostButton } from "@ghostvue/themes"',
        '</script>',
        '<template>',
        '  <GhostButton>{{ label }}</GhostButton>',
        '</template>',
        '<style scoped>.btn {}</style>',
        '```',
        '',
        '~~~md',
        '<GhostExample id="button/basic" />',
        '<<< @/../examples/button/basic.vue',
        '~~~',
      ].join('\n')

      expect(isExecutableMarkdown(prose)).toBe(false)
      expect(stripMarkdownCode(prose)).not.toContain('GhostButton')
    })

    it('detects live script, style, template, Vue tags, interpolations, and includes', () => {
      expect(
        isExecutableMarkdown('<script setup>\nconst x = 1\n</script>\n# Hi'),
      ).toBe(true)
      expect(isExecutableMarkdown('# Hi\n\n<style>\n.a {}\n</style>')).toBe(
        true,
      )
      expect(
        isExecutableMarkdown('# Hi\n\n<template><div></div></template>'),
      ).toBe(true)
      expect(
        isExecutableMarkdown('# Button\n\n<GhostExample id="button/basic" />'),
      ).toBe(true)
      expect(isExecutableMarkdown('# Motion\n\n<MotionReplayDemo />')).toBe(
        true,
      )
      expect(isExecutableMarkdown('# Demo\n\nValue: {{ count }}')).toBe(true)
      expect(
        isExecutableMarkdown('# Snippet\n\n<<< @/../examples/button/basic.vue'),
      ).toBe(true)
      expect(
        isExecutableMarkdown('# Include\n\n<!--@include: ./partial.md-->'),
      ).toBe(true)
    })

    it('matches real repository docs accurately', () => {
      // Executable docs pages
      expect(isExecutableMarkdown(readRepoDoc('docs/themes/density.md'))).toBe(
        true,
      )
      expect(
        isExecutableMarkdown(readRepoDoc('docs/themes/elevation.md')),
      ).toBe(true)
      expect(isExecutableMarkdown(readRepoDoc('docs/themes/motion.md'))).toBe(
        true,
      )
      expect(
        isExecutableMarkdown(readRepoDoc('docs/components/button.md')),
      ).toBe(true)
      expect(isExecutableMarkdown(readRepoDoc('docs/getting-started.md'))).toBe(
        true,
      )

      // Prose-only docs pages (including those with fenced/inline code mentions)
      expect(isExecutableMarkdown(readRepoDoc('docs/philosophy.md'))).toBe(
        false,
      )
      expect(isExecutableMarkdown(readRepoDoc('docs/standards/vue.md'))).toBe(
        false,
      )
      expect(
        isExecutableMarkdown(readRepoDoc('docs/adr/0008-define-theme.md')),
      ).toBe(false)
      expect(
        isExecutableMarkdown(readRepoDoc('docs/components/button-spec.md')),
      ).toBe(false)
    })
  })

  describe('classifyChangedPaths', () => {
    it('skips heavy CI for prose-only docs, AGENTS.md, and .cursor files on PRs', () => {
      const prose = '# Philosophy\n\nPlain prose update.\n'
      const result = classifyChangedPaths({
        eventName: 'pull_request',
        files: ['AGENTS.md', '.cursor/rules/example.mdc', 'docs/philosophy.md'],
        readAtBase: () => prose,
        readAtHead: () => `${prose}\nMore prose.\n`,
      })

      expect(result.skipHeavy).toBe(true)
    })

    it('requires full CI when an executable docs page is edited', () => {
      const executable = '<script setup>\nconst n = 1\n</script>\n\n# Demo\n'
      const result = classifyChangedPaths({
        eventName: 'pull_request',
        files: ['docs/themes/density.md'],
        readAtBase: () => executable,
        readAtHead: () => `${executable}\nUpdated prose.\n`,
      })

      expect(result.skipHeavy).toBe(false)
    })

    it('requires full CI when a PR adds executable blocks to a prose page or deletes an executable page', () => {
      expect(
        isHeavySkipEligible('docs/guide.md', {
          readAtBase: () => '# Guide\n\nProse only.\n',
          readAtHead: () => '# Guide\n\n<GhostExample id="button/basic" />\n',
        }),
      ).toBe(false)

      expect(
        isHeavySkipEligible('docs/guide.md', {
          readAtBase: () => '# Guide\n\n<script setup></script>\n',
          readAtHead: () => null,
        }),
      ).toBe(false)
    })

    it('requires full CI when prose-only docs are mixed with executable docs or code', () => {
      const files = new Map<string, string>([
        ['docs/philosophy.md', '# Philosophy\n\nProse.\n'],
        [
          'docs/components/button.md',
          '# Button\n\n<GhostExample id="button/basic" />\n',
        ],
      ])

      const mixedDocs = classifyChangedPaths({
        eventName: 'pull_request',
        files: ['docs/philosophy.md', 'docs/components/button.md'],
        readAtBase: (f) => files.get(f) ?? null,
        readAtHead: (f) => files.get(f) ?? null,
      })
      expect(mixedDocs.skipHeavy).toBe(false)

      const withSource = classifyChangedPaths({
        eventName: 'pull_request',
        files: ['docs/philosophy.md', 'packages/vue/src/index.ts'],
        readAtBase: (f) => files.get(f) ?? null,
        readAtHead: (f) => files.get(f) ?? null,
      })
      expect(withSource.skipHeavy).toBe(false)
    })

    it('never skips heavy CI on push events or empty diffs', () => {
      expect(
        classifyChangedPaths({
          eventName: 'push',
          files: ['docs/philosophy.md'],
          readAtBase: () => '# Philosophy\n',
          readAtHead: () => '# Philosophy\n',
        }).skipHeavy,
      ).toBe(false)

      expect(
        classifyChangedPaths({
          eventName: 'pull_request',
          files: [],
        }).skipHeavy,
      ).toBe(false)
    })

    it('classifies docs and showcase PRs to docs e2e scope and skips unrelated partitions', () => {
      const executable = '<GhostExample id="button/themed" />\n'
      const result = classifyChangedPaths({
        eventName: 'pull_request',
        files: [
          'docs/components/button.md',
          'apps/docs/.vitepress/theme/DemoPreview.vue',
          'examples/button/themed.vue',
          'tests/e2e/docs-button-showcase.spec.ts',
          'tests/e2e/docs-showcase-visual.spec.ts-snapshots/button.png',
          'tests/e2e/examples-visual.spec.ts',
          '.changeset/docs-update.md',
        ],
        readAtBase: () => executable,
        readAtHead: () => executable,
      })

      expect(result).toMatchObject({
        skipHeavy: false,
        runNuxt: false,
        runCrossBrowser: false,
        runNode24: false,
        runFullScaffold: false,
        e2eScope: 'docs',
      })
    })

    it('enables nuxt without cross-browser or full e2e when only Nuxt files change', () => {
      const result = classifyChangedPaths({
        eventName: 'pull_request',
        files: ['packages/nuxt/src/module.ts', 'apps/nuxt-fixture/app.vue'],
      })

      expect(result).toMatchObject({
        skipHeavy: false,
        runNuxt: true,
        runCrossBrowser: false,
        runNode24: false,
        runFullScaffold: false,
        e2eScope: 'full',
      })
    })

    it('enables full browser, cross-browser, and nuxt for core component changes', () => {
      const result = classifyChangedPaths({
        eventName: 'pull_request',
        files: [
          'packages/vue/src/GhostButton.vue',
          'docs/components/button.md',
        ],
      })

      expect(result).toMatchObject({
        skipHeavy: false,
        runNuxt: true,
        runCrossBrowser: true,
        runNode24: false,
        runFullScaffold: false,
        e2eScope: 'full',
      })
    })

    it('enables cross-browser when non-docs e2e specs or support helpers change', () => {
      expect(
        classifyChangedPaths({
          eventName: 'pull_request',
          files: ['tests/e2e/dialog.spec.ts'],
        }),
      ).toMatchObject({
        runNuxt: false,
        runCrossBrowser: true,
        e2eScope: 'full',
      })

      expect(
        classifyChangedPaths({
          eventName: 'pull_request',
          files: ['tests/support/playground.ts'],
        }),
      ).toMatchObject({
        runCrossBrowser: true,
        e2eScope: 'full',
      })
    })

    it('enables full scaffold verification only on scaffold changes or schedule', () => {
      expect(
        classifyChangedPaths({
          eventName: 'pull_request',
          files: ['scripts/lib/new-component.js'],
        }),
      ).toMatchObject({
        runNuxt: true,
        runFullScaffold: true,
      })

      expect(
        classifyChangedPaths({
          eventName: 'push',
          files: ['packages/vue/src/GhostButton.vue'],
        }),
      ).toMatchObject({
        skipHeavy: false,
        runNuxt: true,
        runCrossBrowser: true,
        runNode24: true,
        runFullScaffold: false,
        e2eScope: 'full',
      })

      expect(
        classifyChangedPaths({
          eventName: 'schedule',
          files: [],
        }),
      ).toMatchObject({
        skipHeavy: false,
        runNuxt: true,
        runCrossBrowser: true,
        runNode24: true,
        runFullScaffold: true,
        e2eScope: 'full',
      })
    })

    it('enables Node 24 matrix when runtime or CI configs change', () => {
      expect(
        classifyChangedPaths({
          eventName: 'pull_request',
          files: ['package.json'],
        }),
      ).toMatchObject({
        runNuxt: true,
        runCrossBrowser: true,
        runNode24: true,
        e2eScope: 'full',
      })
    })
  })

  describe('CLI integration', () => {
    function initGitRepo(): string {
      const repoDir = mkdtempSync(join(tmpdir(), 'ghostvue-ci-paths-'))
      tempDirs.push(repoDir)
      const git = (args: string[]) =>
        execFileSync('git', args, { cwd: repoDir, encoding: 'utf8' }).trim()

      git(['init'])
      git(['config', 'user.email', 'ci@example.com'])
      git(['config', 'user.name', 'CI Test'])
      return repoDir
    }

    function commitFile(
      repoDir: string,
      relPath: string,
      content: string,
    ): string {
      const fullPath = join(repoDir, relPath)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf8')
      execFileSync('git', ['add', relPath], { cwd: repoDir })
      execFileSync('git', ['commit', '-m', `update ${relPath}`], {
        cwd: repoDir,
      })
      return execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoDir,
        encoding: 'utf8',
      }).trim()
    }

    function runClassifierCli(
      repoDir: string,
      baseSha: string,
      eventName = 'pull_request',
    ): string {
      const eventPath = join(repoDir, 'event.json')
      const outputPath = join(repoDir, 'output.txt')
      writeFileSync(
        eventPath,
        JSON.stringify(
          eventName === 'pull_request'
            ? { pull_request: { base: { sha: baseSha } } }
            : {},
        ),
        'utf8',
      )
      writeFileSync(outputPath, '', 'utf8')

      execFileSync(process.execPath, [cliScriptPath], {
        cwd: repoDir,
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: eventName,
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_OUTPUT: outputPath,
        },
        encoding: 'utf8',
      })

      return readFileSync(outputPath, 'utf8')
    }

    it('outputs skip_heavy=true for prose-only docs PR and skip_heavy=false for executable docs PR', () => {
      const repoDir = initGitRepo()
      const baseSha = commitFile(
        repoDir,
        'docs/prose.md',
        '# Prose\n\nInitial.\n',
      )
      commitFile(repoDir, 'docs/prose.md', '# Prose\n\nUpdated.\n')

      expect(runClassifierCli(repoDir, baseSha)).toContain('skip_heavy=true')

      const execBaseSha = commitFile(
        repoDir,
        'docs/live.md',
        '<script setup>\nconst a = 1\n</script>\n\n# Live\n',
      )
      commitFile(
        repoDir,
        'docs/live.md',
        '<script setup>\nconst a = 2\n</script>\n\n# Live\n',
      )

      const liveOutput = runClassifierCli(repoDir, execBaseSha)
      expect(liveOutput).toContain('skip_heavy=false')
      expect(liveOutput).toContain('e2e_scope=docs')
      expect(liveOutput).toContain('run_nuxt=false')
      expect(liveOutput).toContain('run_cross_browser=false')
      expect(liveOutput).toContain('run_node24=false')
      expect(liveOutput).toContain('run_full_scaffold=false')

      const scheduleOutput = runClassifierCli(repoDir, execBaseSha, 'schedule')
      expect(scheduleOutput).toContain('skip_heavy=false')
      expect(scheduleOutput).toContain('run_full_scaffold=true')
      expect(scheduleOutput).toContain('e2e_scope=full')
    })
  })
})
