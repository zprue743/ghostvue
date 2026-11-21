import { describe, expect, it } from 'vitest'

import {
  checkKeyboardEvidence,
  resolveVerification,
  validateVerificationContract,
  type ManifestEntry,
} from '../../scripts/lib/accessibility-verification.js'

const reference = {
  spec: 'tests/e2e/fixture.spec.ts',
  title: 'GhostFixture › presses every key',
  package: '@ghostvue/vue',
}

const notReviewed = { status: 'not-reviewed', evidence: [] }

function fixture(
  automatedKeyboard: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: '1.1.0',
    name: 'GhostFixture',
    package: '@ghostvue/vue',
    accessibility: {
      role: 'listbox',
      apgPattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
      keyboard: { ArrowDown: 'Next.', Escape: 'Close.' },
      requiredAriaAttributes: [],
      verification: {
        automatedKeyboard,
        manual: notReviewed,
        assistiveTechnology: notReviewed,
        ...overrides,
      },
    },
  }
}

const passedFixture = fixture({
  status: 'passed',
  keys: { ArrowDown: [reference], Escape: [reference] },
})

const options = { file: 'fixture.manifest.json', specExists: () => true }

/** A Playwright JSON report shaped like `--reporter=json` output. */
function report(
  tests: Record<string, unknown>[],
  title = 'presses every key',
): Record<string, unknown> {
  return {
    suites: [
      {
        title: 'fixture.spec.ts',
        file: 'fixture.spec.ts',
        specs: [],
        suites: [
          {
            title: 'GhostFixture',
            file: 'fixture.spec.ts',
            specs: [{ title, file: 'fixture.spec.ts', tests }],
          },
        ],
      },
    ],
  }
}

const run = (status: string, overrides: Record<string, unknown> = {}) => ({
  projectName: 'chromium-e2e',
  expectedStatus: 'passed',
  status,
  results: [{ status: status === 'skipped' ? 'skipped' : 'passed' }],
  ...overrides,
})

const entries = (manifest: Record<string, unknown>): ManifestEntry[] => [
  { file: 'fixture.manifest.json', manifest },
]

describe('accessibility verification contract', () => {
  it('treats a manifest without verification as every category not reviewed', () => {
    const accessibility = {
      ...(passedFixture.accessibility as Record<string, unknown>),
    }
    delete accessibility.verification
    const resolved = resolveVerification({ ...passedFixture, accessibility })
    expect(resolved).toEqual({
      recorded: false,
      automatedKeyboard: { status: 'not-reviewed', keys: {} },
      manual: { status: 'not-reviewed', evidence: [] },
      assistiveTechnology: { status: 'not-reviewed', evidence: [] },
    })
  })

  it('does not let a passed automated category change the review categories', () => {
    const resolved = resolveVerification(passedFixture)
    expect(resolved.automatedKeyboard.status).toBe('passed')
    expect(resolved.manual.status).toBe('not-reviewed')
    expect(resolved.assistiveTechnology.status).toBe('not-reviewed')
  })

  it('accepts a complete key map', () => {
    expect(validateVerificationContract(passedFixture, options)).toEqual([])
  })

  it('fails when a declared key has no mapped browser test', () => {
    const violations = validateVerificationContract(
      fixture({ status: 'passed', keys: { ArrowDown: [reference] } }),
      options,
    )
    expect(violations).toEqual([
      expect.stringContaining('"Escape" has no mapped browser test'),
    ])
  })

  it('fails when the map names a key the contract does not declare', () => {
    const violations = validateVerificationContract(
      fixture({
        status: 'passed',
        keys: { ArrowDown: [reference], Escape: [reference], End: [reference] },
      }),
      options,
    )
    expect(violations).toEqual([
      expect.stringContaining('maps "End", which accessibility.keyboard'),
    ])
  })

  it('fails for a missing spec file and for a pre-1.1.0 schemaVersion', () => {
    const violations = validateVerificationContract(
      { ...passedFixture, schemaVersion: '1.0.0' },
      { ...options, specExists: () => false },
    )
    expect(violations).toEqual([
      expect.stringContaining('needs schemaVersion 1.1.0'),
      expect.stringContaining('missing spec tests/e2e/fixture.spec.ts'),
      expect.stringContaining('missing spec tests/e2e/fixture.spec.ts'),
    ])
  })

  it('rejects review evidence recorded for a different component', () => {
    const violations = validateVerificationContract(
      fixture(
        { status: 'not-reviewed', keys: {} },
        {
          manual: {
            status: 'passed',
            evidence: [
              {
                component: 'GhostFixture',
                package: '@ghostvue/themes',
                revision: '0.4.0',
                date: '2026-11-01',
                reviewer: 'QA',
                environment: { browser: 'Chrome', platform: 'macOS' },
                reference: 'https://example.com/r/1',
                summary: 'Keyboard works.',
              },
            ],
          },
        },
      ),
      options,
    )
    expect(violations).toEqual([
      expect.stringContaining(
        'manual.evidence[0] reviews GhostFixture (@ghostvue/themes)',
      ),
    ])
  })

  it('leaves not-reviewed automated evidence unenforced', () => {
    expect(
      validateVerificationContract(
        fixture({ status: 'not-reviewed', keys: {} }),
        options,
      ),
    ).toEqual([])
  })
})

describe('keyboard evidence against Playwright reports', () => {
  it('passes when every mapped test executed and passed, including after a retry', () => {
    expect(
      checkKeyboardEvidence(entries(passedFixture), report([run('expected')]), {
        mode: 'results',
      }),
    ).toEqual([])
    expect(
      checkKeyboardEvidence(entries(passedFixture), report([run('flaky')]), {
        mode: 'results',
      }),
    ).toEqual([])
  })

  it('fails when a mapped test did not run in the report', () => {
    const violations = checkKeyboardEvidence(
      entries(passedFixture),
      report([run('expected')], 'a renamed test'),
      { mode: 'results' },
    )
    expect(violations).toHaveLength(2)
    expect(violations[0]).toContain('not found in the chromium-e2e results')
  })

  it('fails when a mapped test failed, was skipped, or only ran in another project', () => {
    for (const test of [
      run('unexpected', { results: [{ status: 'failed' }] }),
      run('skipped', { expectedStatus: 'skipped' }),
    ]) {
      expect(
        checkKeyboardEvidence(entries(passedFixture), report([test]), {
          mode: 'results',
        }),
      ).toHaveLength(2)
    }
    expect(
      checkKeyboardEvidence(
        entries(passedFixture),
        report([run('expected', { projectName: 'firefox-e2e' })]),
        { mode: 'results' },
      )[0],
    ).toContain('has no chromium-e2e tests')
  })

  it('does not accept an expected failure as passed evidence', () => {
    const violations = checkKeyboardEvidence(
      entries(passedFixture),
      report([
        run('expected', {
          expectedStatus: 'failed',
          results: [{ status: 'failed' }],
        }),
      ]),
      { mode: 'results' },
    )
    expect(violations[0]).toContain('did not pass')
  })

  it('requires a failed record to keep a running expected failure', () => {
    const failedFixture = fixture({
      status: 'failed',
      keys: { ArrowDown: [reference], Escape: [reference] },
    })
    const expectedFailure = run('expected', {
      expectedStatus: 'failed',
      results: [{ status: 'failed' }],
    })
    expect(
      checkKeyboardEvidence(entries(failedFixture), report([expectedFailure]), {
        mode: 'results',
      }),
    ).toEqual([])
    // Once the defect is fixed the test passes; the record must move to passed.
    expect(
      checkKeyboardEvidence(entries(failedFixture), report([run('expected')]), {
        mode: 'results',
      }),
    ).toEqual([
      expect.stringContaining('no mapped test is an expected failure'),
    ])
  })

  it('resolves references from --list output without results', () => {
    const listed = { projectName: 'chromium-e2e', expectedStatus: 'passed' }
    expect(
      checkKeyboardEvidence(entries(passedFixture), report([listed]), {
        mode: 'list',
      }),
    ).toEqual([])
    expect(
      checkKeyboardEvidence(
        entries(passedFixture),
        report([{ ...listed, expectedStatus: 'skipped' }]),
        { mode: 'list' },
      ).length,
    ).toBeGreaterThan(0)
  })

  it('requires passed NVDA+Firefox and VoiceOver+Safari desktop AT evidence for stable manifests', () => {
    const nvdaEntry = {
      component: 'GhostFixture',
      package: '@ghostvue/vue',
      revision: '0.1.0',
      date: '2026-11-20',
      reviewer: 'Actual Tester',
      environment: {
        assistiveTechnology: 'NVDA 2025.1',
        browser: 'Firefox 140',
        platform: 'Windows 11',
      },
      reference: 'https://github.com/zprue743/ghostvue/issues/1',
      summary: 'NVDA+Firefox passed.',
    }
    const voiceOverDesktopEntry = {
      component: 'GhostFixture',
      package: '@ghostvue/vue',
      revision: '0.1.0',
      date: '2026-11-20',
      reviewer: 'Actual Tester',
      environment: {
        assistiveTechnology: 'VoiceOver',
        browser: 'Safari 18.4',
        platform: 'macOS 15.4',
      },
      reference: 'https://github.com/zprue743/ghostvue/issues/1',
      summary: 'VoiceOver+Safari passed.',
    }
    const voiceOverIosEntry = {
      ...voiceOverDesktopEntry,
      environment: {
        assistiveTechnology: 'VoiceOver',
        browser: 'Safari 18.4',
        platform: 'iOS 18.4',
      },
    }

    const withoutVerification = {
      ...passedFixture,
      status: 'stable',
      accessibility: {
        ...(passedFixture.accessibility as Record<string, unknown>),
      },
    }
    delete (withoutVerification.accessibility as Record<string, unknown>)
      .verification
    expect(validateVerificationContract(withoutVerification, options)).toEqual([
      expect.stringContaining('assistiveTechnology.status to be "passed"'),
    ])

    expect(
      validateVerificationContract(
        { ...passedFixture, status: 'stable' },
        options,
      ),
    ).toEqual([
      expect.stringContaining('assistiveTechnology.status to be "passed"'),
    ])

    expect(
      validateVerificationContract(
        {
          ...fixture(
            { status: 'not-reviewed', keys: {} },
            {
              assistiveTechnology: {
                status: 'passed',
                evidence: [nvdaEntry, voiceOverIosEntry],
              },
            },
          ),
          status: 'stable',
        },
        options,
      ),
    ).toEqual([expect.stringContaining('VoiceOver + Safari desktop evidence')])

    expect(
      validateVerificationContract(
        {
          ...fixture(
            { status: 'not-reviewed', keys: {} },
            {
              assistiveTechnology: {
                status: 'passed',
                evidence: [nvdaEntry, voiceOverDesktopEntry],
              },
            },
          ),
          status: 'stable',
        },
        options,
      ),
    ).toEqual([])
  })
})
