/** @vitest-environment node */

import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  discoverComponent,
  executeCommand,
  firstErrorLines,
  verifyComponent,
  type ComponentVerificationReport,
} from '../../scripts/lib/verify-component.js'

const repositoryRoot = process.cwd()

function assertReport(report: ComponentVerificationReport) {
  expect(report.schemaVersion).toBe(1)
  expect(report.component).toMatch(/^Ghost[A-Z]/)
  expect(['pass', 'fail']).toContain(report.status)
  expect(report.durationMs).toBeGreaterThanOrEqual(0)
  for (const check of report.checks) {
    expect(typeof check.name).toBe('string')
    expect(['pass', 'fail', 'skip']).toContain(check.status)
    expect(check.durationMs).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(check.errors)).toBe(true)
    expect(check.errors.every((line) => typeof line === 'string')).toBe(true)
  }
}

describe('component verification reports', () => {
  it('selects GhostButton source, both package manifests, tests and examples', async () => {
    const selection = await discoverComponent(repositoryRoot, 'Button')
    expect(selection.name).toBe('GhostButton')
    expect(selection.sources).toContain('packages/vue/src/use-ghost-button.ts')
    expect(selection.sources).toContain('packages/themes/src/ghost-button.ts')
    expect(selection.tests).toContain('packages/vue/src/GhostButton.test.ts')
    expect(selection.tests).toContain(
      'tests/integration/ghost-button-theme-css.test.ts',
    )
    expect(selection.manifests).toHaveLength(2)
    expect(selection.examples).toContain('examples/button/basic.vue')
    expect(selection.sources.some((file) => file.includes('GhostDialog'))).toBe(
      false,
    )
    const dialog = await discoverComponent(repositoryRoot, 'Dialog')
    expect(dialog.names).toContain('GhostDialogContent')
    expect(dialog.sources).toContain('packages/vue/src/GhostDialogContent.vue')
  })

  it('writes a complete GhostButton report and scopes real checker commands', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-report-'))
    const calls: string[][] = []
    try {
      const result = await verifyComponent({
        repositoryRoot,
        name: 'GhostButton',
        reportPath: join(root, 'report.json'),
        execute: async (args) => {
          calls.push(args)
          if (args.includes('vitest')) {
            const config = args[args.indexOf('--config') + 1]
            expect(config).toBeDefined()
            if (!config) throw new Error('Missing Vitest config')
            const source = await readFile(config, 'utf8')
            expect(source).toContain('GhostButton.test.ts')
            expect(source).not.toContain('GhostDialog.test.ts')
            expect(source).toContain('base.test.coverage')
          }
          return { ok: true, output: '' }
        },
      })
      assertReport(result.report)
      expect(result.report.status).toBe('pass')
      expect(result.report.checks.map((check) => check.name)).toEqual([
        'lint',
        'typecheck',
        'unit-coverage',
        'manifests',
        'boundaries',
        'e2e-axe',
      ])
      expect(
        result.report.checks.every((check) => check.status === 'pass'),
      ).toBe(true)
      expect(calls.find((args) => args.includes('playwright'))).toContain(
        'GhostButton\\b|button/|/components/button\\b',
      )
      expect(calls.find((args) => args.includes('eslint'))).not.toContain(
        'packages/vue/src/GhostDialog.vue',
      )
      const saved: unknown = JSON.parse(
        await readFile(result.reportPath, 'utf8'),
      )
      expect(saved).toEqual(result.report)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('records a deliberate subprocess failure and continues independent checks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-failing-report-'))
    try {
      await cp(
        join(
          repositoryRoot,
          'tests/fixtures/verify-component/failing-source.txt',
        ),
        join(root, 'failure.js'),
      )
      const result = await verifyComponent({
        repositoryRoot,
        name: 'GhostButton',
        reportPath: join(root, 'failure.json'),
        execute: async (args) => {
          if (args.includes('eslint'))
            return await executeCommand(
              [
                process.execPath,
                join(repositoryRoot, 'node_modules/eslint/bin/eslint.js'),
                '--no-config-lookup',
                '--rule',
                'no-undef: error',
                'failure.js',
              ],
              root,
            )
          return { ok: true, output: '' }
        },
      })
      assertReport(result.report)
      expect(result.report.status).toBe('fail')
      expect(result.report.checks[0]?.status).toBe('fail')
      expect(result.report.checks[0]?.errors.join('\n')).toContain(
        'missingComponentIdentifier',
      )
      expect(result.report.checks.at(-1)?.status).toBe('pass')
      expect(JSON.parse(await readFile(result.reportPath, 'utf8'))).toEqual(
        result.report,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('fails a browser host build without running tests against stale assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-host-report-'))
    const calls: string[][] = []
    try {
      const result = await verifyComponent({
        repositoryRoot,
        name: 'GhostButton',
        reportPath: join(root, 'host.json'),
        execute: (args) => {
          calls.push(args)
          return Promise.resolve({
            ok: !args.includes('build'),
            output: args.includes('build')
              ? 'ERROR host fixture failed to build'
              : '',
          })
        },
      })
      expect(result.report.status).toBe('fail')
      expect(result.report.checks.at(-1)).toMatchObject({
        name: 'e2e-axe',
        status: 'fail',
      })
      expect(calls.some((args) => args.includes('playwright'))).toBe(false)
      expect(
        result.report.checks.find((check) => check.name === 'manifests')
          ?.status,
      ).toBe('pass')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('fails discovery rather than reporting a vacuous pass', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-missing-report-'))
    try {
      const result = await verifyComponent({
        repositoryRoot,
        name: 'GhostMissingFixture',
        reportPath: join(root, 'missing.json'),
        execute: () => {
          throw new Error('Must not run dependent commands')
        },
      })
      assertReport(result.report)
      expect(result.report.status).toBe('fail')
      const cli = await executeCommand(
        [
          process.execPath,
          'scripts/verify-component.mjs',
          'GhostMissingFixture',
        ],
        repositoryRoot,
      )
      expect(cli.ok).toBe(false)
      const saved: unknown = JSON.parse(
        await readFile(
          join(
            repositoryRoot,
            'reports/verify-component/GhostMissingFixture.json',
          ),
          'utf8',
        ),
      )
      expect(saved).toMatchObject({
        component: 'GhostMissingFixture',
        status: 'fail',
        schemaVersion: 1,
      })
      expect(result.report.checks[0]?.name).toBe('discovery')
      expect(
        result.report.checks.slice(1).every((check) => check.status === 'skip'),
      ).toBe(true)
      await expect(
        discoverComponent(repositoryRoot, '../Button'),
      ).rejects.toThrow('PascalCase')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('bounds and strips terminal diagnostics and catches spawn failures', async () => {
    const lines = firstErrorLines(
      `progress\n\u001b[31mERROR fixture\u001b[0m\n${'x'.repeat(900)}\n${'detail\n'.repeat(30)}`,
    )
    expect(lines).toHaveLength(12)
    expect(lines[1]).toBe('ERROR fixture')
    expect(lines.every((line) => line.length <= 500)).toBe(true)
    expect(
      (
        await executeCommand(
          ['ghost-nonexistent-checker-fixture'],
          repositoryRoot,
        )
      ).ok,
    ).toBe(false)
  })
})
