/** @vitest-environment node */

import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadRepositoryManifests } from '../../scripts/lib/accessibility-verification.js'
import {
  usagePageForSpec,
  validateRepositoryStatus,
  validateStatusContract,
} from '../../scripts/lib/component-status.js'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))

const reference = {
  spec: 'tests/e2e/fixture.spec.ts',
  title: 'GhostFixture › presses every key',
  package: '@ghostvue/vue',
}

const review = {
  component: 'GhostFixture',
  package: '@ghostvue/vue',
  revision: '0.3.0',
  date: '2026-11-01',
  reviewer: 'Reviewer',
  environment: {
    assistiveTechnology: 'NVDA 2026.1',
    browser: 'Firefox 140',
    platform: 'Windows 11',
  },
  reference: 'https://example.com/review/1',
  summary: 'Reviewed every documented interaction.',
}

const notReviewed = { status: 'not-reviewed', evidence: [] }
const passedReview = { status: 'passed', evidence: [review] }

/** A manifest that meets every beta requirement and no stable-only one. */
function betaFixture(
  overrides: Record<string, unknown> = {},
  verification: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: '1.1.0',
    source: 'generated',
    name: 'GhostFixture',
    package: '@ghostvue/vue',
    status: 'beta',
    description: 'A fixture listbox.',
    props: [
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        description: 'Disables the fixture.',
        deprecated: false,
      },
    ],
    models: [],
    events: [],
    slots: [{ name: 'default', props: [], description: 'Options.' }],
    exposed: [],
    styling: { parts: [], states: [], cssProperties: [] },
    accessibility: {
      role: 'listbox',
      apgPattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
      keyboard: { ArrowDown: 'Next option.' },
      requiredAriaAttributes: [],
      verification: {
        automatedKeyboard: {
          status: 'passed',
          keys: { ArrowDown: [reference] },
        },
        manual: notReviewed,
        assistiveTechnology: notReviewed,
        ...verification,
      },
    },
    examples: ['fixture/basic'],
    spec: {
      path: 'docs/components/fixture-spec.md',
      status: 'approved',
      evidence: 'Approved in review.',
    },
    ...overrides,
  }
}

const options = {
  file: 'fixture.manifest.json',
  docExists: (path: string) => path === 'docs/components/fixture.md',
}

describe('component status contract', () => {
  it('requires no evidence for experimental or deprecated components', () => {
    for (const status of ['experimental', 'deprecated']) {
      expect(
        validateStatusContract(
          {
            name: 'GhostFixture',
            status,
            description: 'Public GhostFixture component.',
            examples: [],
          },
          options,
        ),
      ).toEqual([])
    }
  })

  it('accepts beta with an approved spec, docs, examples, and passing automated checks', () => {
    expect(validateStatusContract(betaFixture(), options)).toEqual([])
  })

  it('rejects beta without an approved spec or usage page', () => {
    const withoutSpec = betaFixture()
    delete withoutSpec.spec
    expect(validateStatusContract(withoutSpec, options)).toEqual([
      'fixture.manifest.json: beta requires an approved component specification (manifest `spec` with status "approved")',
    ])
    expect(
      validateStatusContract(betaFixture(), {
        ...options,
        docExists: () => false,
      }),
    ).toEqual([
      'fixture.manifest.json: beta requires the usage page docs/components/fixture.md',
    ])
  })

  it('rejects beta with incomplete documentation', () => {
    const violations = validateStatusContract(
      betaFixture({
        description: 'Public GhostFixture component.',
        props: [
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: 'Declared prop `disabled`.',
            deprecated: false,
          },
        ],
        slots: [
          { name: 'default', props: [], description: 'Primary content.' },
        ],
        examples: [],
      }),
      options,
    )
    expect(violations).toEqual([
      'fixture.manifest.json: beta requires at least one executable example in `examples`',
      'fixture.manifest.json: beta requires written descriptions; generated placeholder text remains for description, props.disabled, slots.default',
    ])
  })

  it('rejects beta when declared keys lack passing automated keyboard evidence', () => {
    const { accessibility } = betaFixture()
    const withoutVerification = betaFixture({
      accessibility: {
        ...(accessibility as Record<string, unknown>),
        verification: undefined,
      },
    })
    expect(validateStatusContract(withoutVerification, options)).toEqual([
      'fixture.manifest.json: beta requires accessibility.verification.automatedKeyboard "passed" (found "not-reviewed")',
    ])
    expect(
      validateStatusContract(
        betaFixture(
          {},
          {
            automatedKeyboard: {
              status: 'failed',
              keys: { ArrowDown: [reference] },
            },
          },
        ),
        options,
      ),
    ).toEqual([
      'fixture.manifest.json: beta requires accessibility.verification.automatedKeyboard "passed" (found "failed")',
    ])
  })

  it('accepts beta without keyboard evidence when no keys are declared', () => {
    expect(
      validateStatusContract(
        betaFixture({
          accessibility: {
            role: 'generic',
            apgPattern: 'https://www.w3.org/WAI/ARIA/apg/',
            keyboard: {},
            requiredAriaAttributes: [],
          },
        }),
        options,
      ),
    ).toEqual([])
  })

  it('never treats automated evidence as manual or assistive-technology review for stable', () => {
    expect(
      validateStatusContract(betaFixture({ status: 'stable' }), options),
    ).toEqual([
      'fixture.manifest.json: stable requires a passed manual interaction review in accessibility.verification.manual (found "not-reviewed")',
      'fixture.manifest.json: stable requires a passed assistive-technology review in accessibility.verification.assistiveTechnology (found "not-reviewed")',
    ])
    expect(
      validateStatusContract(
        betaFixture({ status: 'stable' }, { manual: passedReview }),
        options,
      ),
    ).toEqual([
      'fixture.manifest.json: stable requires a passed assistive-technology review in accessibility.verification.assistiveTechnology (found "not-reviewed")',
    ])
  })

  it('accepts stable with passed manual and assistive-technology reviews', () => {
    expect(
      validateStatusContract(
        betaFixture(
          { status: 'stable' },
          { manual: passedReview, assistiveTechnology: passedReview },
        ),
        options,
      ),
    ).toEqual([])
  })

  it('maps a spec to its usage page', () => {
    expect(usagePageForSpec('docs/components/date-picker-spec.md')).toBe(
      'docs/components/date-picker.md',
    )
  })

  it('accepts every checked-in manifest status', async () => {
    const entries = await loadRepositoryManifests(repositoryRoot)
    expect(entries.length).toBeGreaterThan(0)
    expect(validateRepositoryStatus(repositoryRoot, entries)).toEqual([])
  })
})
