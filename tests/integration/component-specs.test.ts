import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  checkComponentSpecs,
  extractFrontmatter,
  loadApprovedSpecMetadata,
  parseSimpleYaml,
  validateSpecDocument,
} from '../../scripts/lib/component-specs.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const dir = temporaryDirectories.pop()
    if (dir) await rm(dir, { recursive: true, force: true })
  }
})

async function makeTempRepo() {
  const root = await mkdtemp(join(tmpdir(), 'ghostvue-specs-'))
  temporaryDirectories.push(root)
  await mkdir(join(root, 'docs/components'), { recursive: true })
  await mkdir(join(root, 'packages/vue/manifests'), { recursive: true })
  await writeFile(
    join(root, 'packages/vue/manifests/ghost-widget.manifest.json'),
    JSON.stringify({ name: 'GhostWidget', status: 'experimental' }),
  )
  return root
}

function buildSpec({
  specStatus = 'approved',
  approvalEvidence = 'Approved in PR #1.',
  manifestsBlock = '  - packages/vue/manifests/ghost-widget.manifest.json\n',
  extraFrontmatter = '',
  consumerDataSection = `  consumerData:
    applicable: false
    reason: 'Widget does not accept consumer data collections.'`,
  unresolvedQuestions = '[]',
  bodyOverrides = {},
} = {}) {
  const approvalBlock = approvalEvidence
    ? `approval:\n  evidence: '${approvalEvidence}'\n`
    : ''
  const manifestsLine =
    manifestsBlock === '[]'
      ? 'manifests: []\n'
      : `manifests:\n${manifestsBlock}`
  const frontmatter = `---
schemaVersion: 1.0.0
component: GhostWidget
components:
  - GhostWidget
packages:
  - '@ghostvue/vue'
specStatus: ${specStatus}
${approvalBlock}${manifestsLine}${extraFrontmatter}sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
${consumerDataSection}
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: ${unresolvedQuestions}
---
`

  const sections: Record<string, string> = {
    'Purpose and user problems': 'Enables widget actions.',
    'Non-goals': 'Does not manage layout.',
    'Public API': 'Exposes `modelValue`.',
    'State model': 'Stateless wrapper.',
    'Accessibility contract': 'Uses native semantics.',
    'Rendering and customization':
      'Provides default slot and `data-part="root"`.',
    'Environment behavior': 'SSR safe.',
    Performance: 'Constant time.',
    Composition: 'Standalone primitive.',
    'Test plan': 'Unit and browser tests.',
    'Documentation plan': 'Documented in widget.md.',
    'Compatibility and release impact': 'Additive minor release.',
    ...bodyOverrides,
  }

  const body = Object.entries(sections)
    .map(([heading, prose]) => `## ${heading}\n\n${prose}`)
    .join('\n\n')

  return `${frontmatter}\n# GhostWidget specification\n\n${body}\n`
}

describe('component spec frontmatter parser and validator', () => {
  it('parses nested mappings, sequences, booleans, and quoted strings', () => {
    const parsed = parseSimpleYaml(`
schemaVersion: 1.0.0
component: GhostWidget
components:
  - GhostWidget
sections:
  consumerData:
    applicable: false
    reason: 'No collections'
unresolvedQuestions: []
`)
    expect(parsed.component).toBe('GhostWidget')
    expect(parsed.components).toEqual(['GhostWidget'])
    expect(parsed.sections).toEqual({
      consumerData: { applicable: false, reason: 'No collections' },
    })
    expect(parsed.unresolvedQuestions).toEqual([])

    const escaped = parseSimpleYaml(
      'escapedBackslashN: "\\\\n"\nliteralNewline: "a\\nb"\nquoted: "say \\"hi\\""',
    )
    expect(escaped.escapedBackslashN).toBe('\\n')
    expect(escaped.literalNewline).toBe('a\nb')
    expect(escaped.quoted).toBe('say "hi"')
  })

  it('passes a valid approved spec covering all exported components', async () => {
    const root = await makeTempRepo()
    await writeFile(join(root, 'docs/components/widget-spec.md'), buildSpec())

    const result = await checkComponentSpecs(root)
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.approvedCount).toBe(1)
  })

  it('fails when an exported component has no spec file', async () => {
    const root = await makeTempRepo()
    const result = await checkComponentSpecs(root)
    expect(result.ok).toBe(false)
    expect(result.violations[0]).toContain('GhostWidget')
    expect(result.violations[0]).toContain('has no component specification')
  })

  it('warns (without failing) when specStatus is not approved (e.g. proposed or pending-review)', async () => {
    const root = await makeTempRepo()
    for (const status of ['proposed', 'pending-review', 'submitted', 'draft']) {
      const { violations, warnings } = await validateSpecDocument({
        repositoryRoot: root,
        relativePath: 'docs/components/widget-spec.md',
        content: buildSpec({ specStatus: status, approvalEvidence: '' }),
      })
      expect(violations).toEqual([])
      expect(
        warnings.some((w) => w.includes(`specStatus is "${status}"`)),
      ).toBe(true)
    }

    await writeFile(
      join(root, 'docs/components/widget-spec.md'),
      buildSpec({ specStatus: 'proposed', approvalEvidence: '' }),
    )
    const result = await checkComponentSpecs(root)
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.approvedCount).toBe(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('specStatus is "proposed"')
  })

  it('fails when approved spec lacks approval.evidence', async () => {
    const root = await makeTempRepo()
    const { violations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({ specStatus: 'approved', approvalEvidence: '' }),
    })
    expect(
      violations.some((v) => v.includes('must include approval.evidence')),
    ).toBe(true)
  })

  it('fails when unresolvedQuestions contains a blocking question', async () => {
    const root = await makeTempRepo()
    const { violations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({
        unresolvedQuestions: "\n  - 'Should ESC close nested popovers?'",
      }),
    })
    expect(
      violations.some((v) => v.includes('unresolved required question')),
    ).toBe(true)
  })

  it('fails when a not-applicable section omits a reason', async () => {
    const root = await makeTempRepo()
    const { violations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({
        consumerDataSection: `  consumerData:
    applicable: false`,
      }),
    })
    expect(
      violations.some((v) =>
        v.includes('marked not-applicable without a non-empty reason'),
      ),
    ).toBe(true)
  })

  it('fails when an applicable section is missing or contains template placeholders', async () => {
    const root = await makeTempRepo()
    const { violations: missingViolations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({
        bodyOverrides: { Performance: '' },
      }),
    })
    expect(
      missingViolations.some((v) =>
        v.includes('applicable section "performance" has empty content'),
      ),
    ).toBe(true)

    const { violations: placeholderViolations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({
        bodyOverrides: { Performance: 'TBD after benchmarking.' },
      }),
    })
    expect(
      placeholderViolations.some((v) =>
        v.includes('unresolved template or placeholder text'),
      ),
    ).toBe(true)
  })

  it('rejects duplicated manifest fields such as keyboard or apgPattern in frontmatter', async () => {
    const root = await makeTempRepo()
    const { violations } = await validateSpecDocument({
      repositoryRoot: root,
      relativePath: 'docs/components/widget-spec.md',
      content: buildSpec({
        extraFrontmatter: "keyboard:\n  Enter: 'Activate'\n",
      }),
    })
    expect(
      violations.some((v) =>
        v.includes('must not duplicate manifest field "keyboard"'),
      ),
    ).toBe(true)
  })

  it('loadApprovedSpecMetadata returns only approved specs with evidence', async () => {
    const root = await makeTempRepo()
    await writeFile(
      join(root, 'docs/components/widget-spec.md'),
      buildSpec({ specStatus: 'approved', approvalEvidence: 'PR #1' }),
    )
    await writeFile(
      join(root, 'docs/components/draft-spec.md'),
      buildSpec({ specStatus: 'proposed', approvalEvidence: '' }).replaceAll(
        'GhostWidget',
        'GhostDraft',
      ),
    )

    const approved = await loadApprovedSpecMetadata(root)
    expect(approved.get('GhostWidget')).toEqual({
      path: 'docs/components/widget-spec.md',
      status: 'approved',
      evidence: 'PR #1',
    })
    expect(approved.has('GhostDraft')).toBe(false)
    expect(extractFrontmatter('plain markdown')).toBeNull()
  })

  it('allows empty manifests for pre-implementation specs but requires manifests for exported components', async () => {
    const root = await makeTempRepo()
    await writeFile(join(root, 'docs/components/widget-spec.md'), buildSpec())
    await writeFile(
      join(root, 'docs/components/planned-spec.md'),
      buildSpec({
        specStatus: 'proposed',
        approvalEvidence: '',
        manifestsBlock: '[]',
      }).replaceAll('GhostWidget', 'GhostPlanned'),
    )

    const plannedResult = await checkComponentSpecs(root)
    expect(plannedResult.violations).toEqual([])
    expect(plannedResult.ok).toBe(true)

    await writeFile(
      join(root, 'docs/components/widget-spec.md'),
      buildSpec({ manifestsBlock: '[]' }),
    )
    const exportedWithoutManifests = await checkComponentSpecs(root)
    expect(exportedWithoutManifests.ok).toBe(false)
    expect(
      exportedWithoutManifests.violations.some((v) =>
        v.includes(
          'manifests must be a non-empty array of manifest paths for exported components',
        ),
      ),
    ).toBe(true)
  })

  it('passes on the current repository state including GhostPortal', async () => {
    const repoRoot = join(import.meta.dirname, '../..')
    const result = await checkComponentSpecs(repoRoot)
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.exportedCount).toBeGreaterThan(0)
  })
})
