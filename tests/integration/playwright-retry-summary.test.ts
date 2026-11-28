import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve('scripts/summarize-playwright-retries.mjs')

function summarize(suites: unknown[]) {
  const directory = mkdtempSync(join(tmpdir(), 'ghostvue-playwright-retries-'))
  try {
    const report = join(directory, 'results.json')
    const output = join(directory, 'github-output')
    writeFileSync(report, JSON.stringify({ suites }))
    writeFileSync(output, '')
    const markdown = execFileSync(process.execPath, [script, report], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_OUTPUT: output,
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_RUN_ID: '123',
      },
    })
    return { markdown, outputs: readFileSync(output, 'utf8') }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function testResult(
  projectName: string,
  status: 'flaky' | 'expected' | 'unexpected' | 'skipped',
  attempts: string[],
  expectedStatus = 'passed',
) {
  return {
    projectName,
    status,
    expectedStatus,
    results: attempts.map((attempt, retry) => ({ status: attempt, retry })),
  }
}

describe('Playwright retry summary', () => {
  it('lists retry passes by project and nested test title with the successful retry', () => {
    const { markdown, outputs } = summarize([
      {
        title: 'ghost-toast.spec.ts',
        specs: [],
        suites: [
          {
            title: 'Toast actions',
            specs: [
              {
                title: 'announces the [retry]\nonce',
                file: 'ghost-toast.spec.ts',
                line: 24,
                tests: [
                  testResult('chromium-e2e', 'flaky', ['timedOut', 'passed']),
                  testResult('firefox-e2e', 'flaky', [
                    'failed',
                    'timedOut',
                    'passed',
                  ]),
                  testResult('webkit-e2e', 'expected', ['passed']),
                ],
              },
            ],
          },
        ],
      },
    ])

    expect(markdown).toContain('2 test runs passed on retry.')
    expect(markdown).toContain(
      '**chromium-e2e** · tests/e2e/ghost-toast.spec.ts:24 · Toast actions › announces the \\[retry\\] once (retry 1)',
    )
    expect(markdown).toContain(
      '**firefox-e2e** · tests/e2e/ghost-toast.spec.ts:24 · Toast actions › announces the \\[retry\\] once (retry 2)',
    )
    expect(markdown).toContain(
      '[Playwright HTML report](https://github.com/owner/repo/actions/runs/123#artifacts)',
    )
    expect(markdown).not.toContain('webkit-e2e')
    expect(outputs).toBe('has_flakes=true\n')
  })

  it('leaves the report upload flag unset when no test actually passes on retry', () => {
    const { markdown, outputs } = summarize([
      {
        title: 'ghost-dialog.spec.ts',
        specs: [
          {
            title: 'checks focus',
            file: 'ghost-dialog.spec.ts',
            line: 21,
            tests: [
              testResult('chromium-e2e', 'unexpected', ['failed', 'failed']),
              testResult(
                'firefox-e2e',
                'flaky',
                ['passed', 'failed'],
                'failed',
              ),
              testResult('webkit-e2e', 'skipped', ['skipped']),
            ],
          },
        ],
      },
    ])

    expect(markdown).toContain('No tests passed on retry.')
    expect(markdown).not.toContain('checks focus')
    expect(outputs).toBe('')
  })
})
