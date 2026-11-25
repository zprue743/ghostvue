/** @vitest-environment node */

/**
 * Covers the decisions behind the opt-in "Update visual baselines" workflow
 * (GHO-204): which visual tests are regenerated, which paths may be committed,
 * and what the commit says. The fixture is a trimmed JSON report from a real
 * `playwright test --project=chromium` run in the pinned Playwright image after
 * a density baseline was overwritten and another deleted.
 */

import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  baselineCommitMessage,
  checkSnapshotOnlyChanges,
  collectVisualFailures,
  deriveGhoKey,
  deriveTrackingKey,
  failureLocations,
  formatResultMarkdown,
  isBaselineSnapshotPath,
  parsePorcelainStatus,
  regenerateBaselines,
  type PlaywrightRunRequest,
} from '../../scripts/lib/visual-baselines.js'

const repositoryRoot = process.cwd()
const cliScriptPath = resolve(
  repositoryRoot,
  'scripts/update-visual-baselines.mjs',
)
const realReport: unknown = JSON.parse(
  readFileSync(
    resolve(
      repositoryRoot,
      'tests/fixtures/visual-baselines/density-screenshot-mismatch.json',
    ),
    'utf8',
  ),
)

const SNAPSHOT =
  'tests/e2e/density.spec.ts-snapshots/density-compact-chromium-linux.png'

interface FakeTest {
  file?: string
  line?: number
  title?: string
  status?: 'expected' | 'unexpected' | 'skipped' | 'flaky'
  messages?: string[]
}

/** Builds a minimal JSON report in the shape the Playwright JSON reporter writes. */
function report(tests: FakeTest[], errors: string[] = []): unknown {
  return {
    config: { rootDir: '/repo/tests/e2e' },
    errors: errors.map((message) => ({ message })),
    suites: tests.map(
      ({
        file = 'density.spec.ts',
        line = 31,
        title = 'renders',
        status = 'expected',
        messages = [],
      }) => ({
        title: file,
        file,
        specs: [
          {
            title,
            file,
            line,
            tests: [
              {
                projectName: 'chromium',
                status,
                results: [
                  {
                    status: status === 'unexpected' ? 'failed' : 'passed',
                    errors: messages.map((message) => ({ message })),
                  },
                ],
              },
            ],
          },
        ],
        suites: [],
      }),
    ),
  }
}

const screenshotMismatch =
  'Error: expect(page).toHaveScreenshot(expected) failed\n\n  120 pixels are different.'
const missingSnapshot =
  "Error: A snapshot doesn't exist at /repo/tests/e2e/x.spec.ts-snapshots/a-chromium-linux.png."
const timeout = 'Test timeout of 30000ms exceeded.'

/** Fake Playwright runner that replays one report per call and records requests. */
function fakeRunner(reports: unknown[]) {
  const requests: PlaywrightRunRequest[] = []
  return {
    requests,
    runPlaywright: (request: PlaywrightRunRequest) => {
      requests.push(request)
      const next = reports.shift()
      if (next === undefined) throw new Error('unexpected Playwright run')
      return Promise.resolve(next)
    },
  }
}

describe('collectVisualFailures', () => {
  it('reads a real report and returns repository-relative locations', () => {
    const { snapshotFailures, otherFailures, globalErrors } =
      collectVisualFailures(realReport, { cwd: '/work' })
    expect(otherFailures).toEqual([])
    expect(globalErrors).toEqual([])
    expect(snapshotFailures).toHaveLength(1)
    expect(snapshotFailures[0]).toMatchObject({
      file: 'tests/e2e/density.spec.ts',
      line: 31,
      project: 'chromium',
      title:
        'density, type, and roundness › renders GhostButton at every density and roundness',
    })
    // ANSI colors are stripped so messages read cleanly in PR comments.
    expect(snapshotFailures[0]?.messages[0]).toMatch(
      /^Error: expect\(locator\)\.toHaveScreenshot\(expected\) failed/,
    )
    expect(failureLocations(snapshotFailures)).toEqual([
      'tests/e2e/density.spec.ts:31',
    ])
  })

  it('treats missing baselines as fixable and other errors as not', () => {
    const result = collectVisualFailures(
      report([
        { title: 'missing', status: 'unexpected', messages: [missingSnapshot] },
        { title: 'timeout', status: 'unexpected', messages: [timeout] },
        {
          title: 'mixed',
          status: 'unexpected',
          messages: [
            screenshotMismatch,
            'expect(locator).toBeVisible() failed',
          ],
        },
        { title: 'passing' },
        { title: 'skipped', status: 'skipped' },
      ]),
      { cwd: '/repo' },
    )
    expect(result.snapshotFailures.map(({ title }) => title)).toEqual([
      'missing',
    ])
    expect(result.otherFailures.map(({ title }) => title)).toEqual([
      'timeout',
      'mixed',
    ])
  })

  it('reports global errors and rejects non-reports', () => {
    expect(
      collectVisualFailures(report([], ['Error: No tests found']), {
        cwd: '/repo',
      }).globalErrors,
    ).toEqual(['Error: No tests found'])
    expect(() => collectVisualFailures({}, { cwd: '/repo' })).toThrow(
      /Not a Playwright JSON report/,
    )
  })

  it('deduplicates loop-generated tests that share one location', () => {
    const { snapshotFailures } = collectVisualFailures(
      report([
        {
          file: 'b.spec.ts',
          line: 9,
          status: 'unexpected',
          messages: [screenshotMismatch],
        },
        {
          file: 'a.spec.ts',
          line: 4,
          status: 'unexpected',
          messages: [screenshotMismatch],
        },
        {
          file: 'b.spec.ts',
          line: 9,
          status: 'unexpected',
          messages: [screenshotMismatch],
        },
      ]),
      { cwd: '/repo' },
    )
    expect(failureLocations(snapshotFailures)).toEqual([
      'tests/e2e/a.spec.ts:4',
      'tests/e2e/b.spec.ts:9',
    ])
  })
})

describe('snapshot-only changes', () => {
  it('accepts only Linux Chromium baselines in spec snapshot directories', () => {
    expect(isBaselineSnapshotPath(SNAPSHOT)).toBe(true)
    for (const path of [
      'tests/e2e/density.spec.ts-snapshots/density-compact-chromium-darwin.png',
      'tests/e2e/density.spec.ts-snapshots/nested/a-chromium-linux.png',
      'tests/e2e/density.spec.ts',
      'tests/e2e/../../scripts/x-chromium-linux.png',
      'scripts/a.spec.ts-snapshots/a-chromium-linux.png',
      `${SNAPSHOT}.txt`,
    ]) {
      expect(isBaselineSnapshotPath(path), path).toBe(false)
    }
  })

  it('parses porcelain -z output including renames', () => {
    expect(
      parsePorcelainStatus(
        ` M ${SNAPSHOT}\0?? tests/e2e/x.spec.ts-snapshots/new-chromium-linux.png\0R  new.ts\0old.ts\0`,
      ),
    ).toEqual([
      { status: ' M', path: SNAPSHOT },
      {
        status: '??',
        path: 'tests/e2e/x.spec.ts-snapshots/new-chromium-linux.png',
      },
      { status: 'R ', path: 'new.ts', from: 'old.ts' },
    ])
    expect(parsePorcelainStatus('')).toEqual([])
  })

  it('flags deletions, renames, and non-snapshot paths as offenders', () => {
    const newSnapshot = 'tests/e2e/x.spec.ts-snapshots/new-chromium-linux.png'
    expect(
      checkSnapshotOnlyChanges([
        { status: ' M', path: SNAPSHOT },
        { status: '??', path: newSnapshot },
        {
          status: ' D',
          path: 'tests/e2e/x.spec.ts-snapshots/gone-chromium-linux.png',
        },
        { status: 'R ', path: newSnapshot, from: 'scripts/a.mjs' },
        { status: ' M', path: 'pnpm-lock.yaml' },
      ]),
    ).toEqual({
      snapshotFiles: [SNAPSHOT, newSnapshot],
      offenders: [
        ' D tests/e2e/x.spec.ts-snapshots/gone-chromium-linux.png',
        ' M pnpm-lock.yaml',
        `R  scripts/a.mjs -> ${newSnapshot}`,
      ],
    })
  })
})

describe('commit message', () => {
  it('prefers the GHO key in the title, then the branch', () => {
    expect(
      deriveGhoKey({ title: 'feat: card (gho-12)', branch: 'agent/gho-99-x' }),
    ).toBe('GHO-12')
    expect(
      deriveGhoKey({ title: 'feat: card', branch: 'agent/gho-99-x' }),
    ).toBe('GHO-99')
    expect(deriveGhoKey({ title: 'feat: XGHO-1', branch: 'main' })).toBeNull()
  })

  it('resolves GitHub issue numbers from issue-<n>-* branches and Fixes/Closes #n', () => {
    expect(
      deriveTrackingKey({
        title: 'fix: visual baselines',
        branch: 'issue-322-visual-baselines-issue-branches',
      }),
    ).toBe('#322')
    expect(
      deriveTrackingKey({
        title: 'fix: tooltip',
        branch: 'agent/issue-42-tooltip-focus',
      }),
    ).toBe('#42')
    expect(
      deriveTrackingKey({
        title: 'fix: tooltip',
        branch: 'fix/tooltip',
        body: 'Summary\n\nFixes #108\n',
      }),
    ).toBe('#108')
    expect(
      deriveTrackingKey({
        title: 'fix: tooltip',
        branch: 'fix/tooltip',
        body: 'closes #215',
      }),
    ).toBe('#215')
    expect(
      deriveTrackingKey({
        title: 'feat: card (GHO-12)',
        branch: 'agent/gho-99-x',
      }),
    ).toBe('GHO-12')
    expect(
      deriveTrackingKey({
        title: 'fix: unrelated',
        branch: 'my-issue-7-branch',
        body: 'Related to #7',
      }),
    ).toBeNull()
  })

  it('falls back to the pull request number without a key', () => {
    expect(
      baselineCommitMessage({
        title: 'ci: things (GHO-204)',
        branch: 'x',
        prNumber: 5,
      }),
    ).toBe('test(visual): regenerate baselines (GHO-204)')
    expect(
      baselineCommitMessage({
        title: 'fix: x',
        branch: 'issue-322-slug',
        prNumber: 5,
      }),
    ).toBe('test(visual): regenerate baselines (#322)')
    expect(
      baselineCommitMessage({
        title: 'fix: x',
        branch: 'fix-x',
        body: 'Closes #77',
        prNumber: 5,
      }),
    ).toBe('test(visual): regenerate baselines (#77)')
    expect(
      baselineCommitMessage({ title: 'fix: x', branch: 'fix-x', prNumber: 42 }),
    ).toBe('test(visual): regenerate baselines (#42)')
  })
})

describe('regenerateBaselines', () => {
  const failing = report([
    { status: 'unexpected', messages: [screenshotMismatch] },
    { file: 'b.spec.ts', line: 3 },
  ])
  const passing = report([{}, { file: 'b.spec.ts', line: 3 }])

  it('changes nothing when every visual test passes', async () => {
    const runner = fakeRunner([passing])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.reject(new Error('not reached')),
      cwd: '/repo',
    })
    expect(result.outcome).toBe('noop')
    expect(result.files).toEqual([])
    expect(runner.requests).toEqual([
      { locations: [], updateSnapshots: 'none' },
    ])
  })

  it('updates only failing locations, confirms them, and returns the snapshots', async () => {
    const runner = fakeRunner([failing, passing, passing])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.resolve(` M ${SNAPSHOT}\0`),
      cwd: '/repo',
      locations: ['tests/e2e/density.spec.ts'],
    })
    expect(runner.requests).toEqual([
      { locations: ['tests/e2e/density.spec.ts'], updateSnapshots: 'none' },
      {
        locations: ['tests/e2e/density.spec.ts:31'],
        updateSnapshots: 'changed',
      },
      { locations: ['tests/e2e/density.spec.ts:31'], updateSnapshots: 'none' },
    ])
    expect(result).toMatchObject({ outcome: 'changes', files: [SNAPSHOT] })
    expect(formatResultMarkdown(result)).toContain(`- \`${SNAPSHOT}\``)
  })

  it('refuses to update when a visual test fails for another reason', async () => {
    const runner = fakeRunner([
      report([
        { status: 'unexpected', messages: [screenshotMismatch] },
        {
          file: 'b.spec.ts',
          line: 3,
          status: 'unexpected',
          messages: [timeout],
        },
      ]),
    ])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.reject(new Error('not reached')),
      cwd: '/repo',
    })
    expect(result.outcome).toBe('failed')
    expect(runner.requests).toHaveLength(1)
    expect(formatResultMarkdown(result)).toContain(
      `\`tests/e2e/b.spec.ts:3\` renders: ${timeout}`,
    )
  })

  it('fails when the update run itself fails', async () => {
    const runner = fakeRunner([
      failing,
      report([{ status: 'unexpected', messages: [timeout] }]),
    ])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.reject(new Error('not reached')),
      cwd: '/repo',
    })
    expect(result).toMatchObject({ outcome: 'failed', files: [] })
    expect(result.summary).toMatch(/Regenerating the failing baselines failed/)
  })

  it('fails when a regenerated test still fails on the confirmation run', async () => {
    const runner = fakeRunner([failing, passing, failing])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.resolve(` M ${SNAPSHOT}\0`),
      cwd: '/repo',
    })
    expect(result).toMatchObject({ outcome: 'failed', files: [] })
    expect(result.summary).toMatch(/still fail after/)
  })

  it('fails when anything besides snapshots changed', async () => {
    const runner = fakeRunner([failing, passing, passing])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () =>
        Promise.resolve(` M ${SNAPSHOT}\0 M packages/vue/src/index.ts\0`),
      cwd: '/repo',
    })
    expect(result).toMatchObject({ outcome: 'failed', files: [] })
    expect(formatResultMarkdown(result)).toContain(
      '` M packages/vue/src/index.ts`',
    )
  })

  it('fails as flaky when tests recover without any baseline changing', async () => {
    const runner = fakeRunner([failing, passing, passing])
    const result = await regenerateBaselines({
      ...runner,
      readStatus: () => Promise.resolve(''),
      cwd: '/repo',
    })
    expect(result).toMatchObject({ outcome: 'failed', files: [] })
    expect(result.summary).toMatch(/flaky/)
  })
})

describe('update-visual-baselines CLI', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  function run(
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
  ) {
    try {
      const stdout = execFileSync('node', [cliScriptPath, ...args], {
        cwd: options.cwd ?? repositoryRoot,
        env: { ...process.env, GITHUB_OUTPUT: '', ...options.env },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { status: 0, stdout, stderr: '' }
    } catch (error) {
      const failure = error as {
        status: number
        stdout: string
        stderr: string
      }
      return failure
    }
  }

  /** A git repository with one committed baseline and a staged artifact dir. */
  function fixtureRepository() {
    const root = mkdtempSync(join(tmpdir(), 'ghostvue-baselines-'))
    tempDirs.push(root)
    const repo = join(root, 'repo')
    mkdirSync(join(repo, 'tests/e2e/density.spec.ts-snapshots'), {
      recursive: true,
    })
    writeFileSync(join(repo, SNAPSHOT), 'old')
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: repo, stdio: 'ignore' })
    git('init', '-q')
    git('add', '.')
    git(
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@example.com',
      'commit',
      '-qm',
      'init',
    )

    const artifact = join(root, 'artifact')
    mkdirSync(join(artifact, 'files/tests/e2e/density.spec.ts-snapshots'), {
      recursive: true,
    })
    writeFileSync(join(artifact, 'files', SNAPSHOT), 'new')
    return { repo, artifact }
  }

  it('prints the commit message from environment variables', () => {
    const result = run(['commit-message'], {
      env: {
        PR_NUMBER: '12',
        PR_TITLE: 'feat: $(touch pwned) `x`',
        PR_HEAD_REF: 'agent/gho-77-thing',
      },
    })
    expect(result.stdout.trim()).toBe(
      'test(visual): regenerate baselines (GHO-77)',
    )
  })

  it('applies staged snapshots and reports the count', () => {
    const { repo, artifact } = fixtureRepository()
    const outputPath = join(artifact, 'github-output')
    writeFileSync(outputPath, '')
    const result = run(['apply', '--from', artifact], {
      cwd: repo,
      env: { GITHUB_OUTPUT: outputPath },
    })
    expect(result.status).toBe(0)
    expect(readFileSync(join(repo, SNAPSHOT), 'utf8')).toBe('new')
    expect(readFileSync(outputPath, 'utf8')).toBe('count=1\n')
  })

  it('refuses artifacts that contain anything but snapshots', () => {
    const { repo, artifact } = fixtureRepository()
    mkdirSync(join(artifact, 'files/.git/hooks'), { recursive: true })
    writeFileSync(join(artifact, 'files/.git/hooks/pre-commit'), 'exit 0')
    const result = run(['apply', '--from', artifact], { cwd: repo })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.git/hooks/pre-commit')
    // Nothing is copied when any file is rejected.
    expect(readFileSync(join(repo, SNAPSHOT), 'utf8')).toBe('old')
  })

  it('refuses when the working tree has other changes', () => {
    const { repo, artifact } = fixtureRepository()
    writeFileSync(join(repo, 'notes.txt'), 'dirty')
    const result = run(['apply', '--from', artifact], { cwd: repo })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('?? notes.txt')
  })

  it('refuses an artifact with no changes', () => {
    const { repo, artifact } = fixtureRepository()
    writeFileSync(join(artifact, 'files', SNAPSHOT), 'old')
    const result = run(['apply', '--from', artifact], { cwd: repo })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('nothing to commit')
  })
})
