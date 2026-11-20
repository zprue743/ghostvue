import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  manifestToMarkdown,
  writeComponentReferences,
  type ReferenceManifest,
} from '../../scripts/lib/component-reference.js'

const manifest: ReferenceManifest = {
  schemaVersion: '1.0.0',
  source: 'generated',
  name: 'GhostFixture',
  package: '@ghostvue/vue',
  status: 'experimental',
  description: 'A fixture.',
  props: [
    {
      name: 'value',
      type: 'string | null',
      default: null,
      required: false,
      description: 'Optional value.',
      deprecated: false,
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: false,
      required: false,
      description: 'Disabled.',
      deprecated: false,
    },
    {
      name: 'label',
      type: 'string',
      default: '',
      required: false,
      description: 'Label.',
      deprecated: false,
    },
    {
      name: 'count',
      type: 'number',
      default: 0,
      required: false,
      description: 'Count.',
      deprecated: false,
    },
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Required id.',
      deprecated: false,
    },
  ],
  models: [
    {
      prop: 'value',
      event: 'update:value',
      type: 'string',
      description: 'Controlled value.',
    },
  ],
  events: [
    { name: 'select', payloadType: 'string', description: 'Selection.' },
  ],
  slots: [
    {
      name: 'default',
      description: 'Content.',
      props: [{ name: 'open', type: 'boolean', description: 'Whether open.' }],
    },
  ],
  exposed: [
    {
      name: 'focus',
      kind: 'method',
      type: '() => void',
      description: 'Focus.',
    },
  ],
  styling: {
    parts: [{ name: 'root', description: 'Root.' }],
    states: [{ name: 'open', description: 'Open.' }],
    cssProperties: [{ name: '--ghost-color', description: 'Color.' }],
  },
  accessibility: {
    role: 'listbox',
    apgPattern: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
    keyboard: { ArrowDown: 'Moves to the next option.', Home: 'First option.' },
    requiredAriaAttributes: ['aria-label'],
  },
  examples: ['fixture/basic'],
}

const keyboardTest = {
  spec: 'tests/e2e/fixture.spec.ts',
  title: 'GhostFixture › presses every key',
  package: '@ghostvue/vue',
}

describe('component reference generation', () => {
  it('renders every contract section and preserves absent versus falsy defaults', () => {
    const markdown = manifestToMarkdown(manifest)
    for (const content of [
      '# GhostFixture reference',
      '@ghostvue/vue',
      '## Props',
      'string &#124; null',
      '<code>null</code>',
      '<code>false</code>',
      '<code>0</code>',
      '<code>""</code>',
      '| <code>id</code> | <code>string</code> | — | Yes |',
      '## Emits',
      'select',
      'update:value',
      '## Slots',
      '## Slot props: default',
      'Whether open.',
      '## Exposed members',
      'data-part',
      'data-state',
      '--ghost-color',
      'https://github.com/zprue743/ghostvue/blob/master/examples/fixture/basic.vue',
      '<GhostExample id="fixture/basic" />',
    ]) {
      expect(markdown).toContain(content)
    }
    expect(manifestToMarkdown(manifest)).toBe(markdown)
  })

  it('renders the accessibility contract with every category not reviewed when verification is absent', () => {
    const markdown = manifestToMarkdown(manifest)
    expect(markdown).toContain('## Accessibility')
    expect(markdown).toContain('Role: <code>listbox</code>.')
    expect(markdown).toContain(
      '<a href="https://www.w3.org/WAI/ARIA/apg/patterns/listbox/">',
    )
    expect(markdown).toContain(
      'Required ARIA attributes: <code>aria-label</code>.',
    )
    expect(markdown).toContain(
      '| <code>ArrowDown</code> | Moves to the next option. | Not reviewed |',
    )
    expect(markdown).toContain('| Automated keyboard | Not reviewed |')
    expect(markdown).toContain(
      '| Manual interaction | Not reviewed | No review recorded. |',
    )
    expect(markdown).toContain(
      '| Assistive technology | Not reviewed | No review recorded. |',
    )
  })

  it('keeps automated keyboard success separate from manual and assistive-technology review', () => {
    const markdown = manifestToMarkdown({
      ...manifest,
      accessibility: {
        ...manifest.accessibility,
        verification: {
          automatedKeyboard: {
            status: 'passed',
            keys: { ArrowDown: [keyboardTest], Home: [keyboardTest] },
          },
          manual: { status: 'not-reviewed', evidence: [] },
          assistiveTechnology: { status: 'not-reviewed', evidence: [] },
        },
      },
    })
    expect(markdown).toContain(
      '| <code>ArrowDown</code> | Moves to the next option. | <a href="https://github.com/zprue743/ghostvue/blob/master/tests/e2e/fixture.spec.ts">GhostFixture › presses every key</a> (<code>@ghostvue/vue</code>) |',
    )
    expect(markdown).toContain('| Automated keyboard | Passed |')
    expect(markdown).toContain(
      '| Manual interaction | Not reviewed | No review recorded. |',
    )
    expect(markdown).toContain(
      '| Assistive technology | Not reviewed | No review recorded. |',
    )
    expect(markdown).toContain(
      'Automated keyboard and axe results do not attest manual or assistive-technology review.',
    )
  })

  it('identifies the reviewed component revision and environment for review evidence', () => {
    const markdown = manifestToMarkdown({
      ...manifest,
      accessibility: {
        ...manifest.accessibility,
        verification: {
          automatedKeyboard: { status: 'not-reviewed', keys: {} },
          manual: { status: 'not-reviewed', evidence: [] },
          assistiveTechnology: {
            status: 'failed',
            evidence: [
              {
                component: 'GhostFixture',
                package: '@ghostvue/vue',
                revision: '0.4.0',
                date: '2026-11-01',
                reviewer: 'Accessibility guild',
                environment: {
                  assistiveTechnology: 'NVDA 2025.1',
                  browser: 'Firefox 140',
                  platform: 'Windows 11',
                },
                reference: 'https://example.com/reviews/1',
                summary: 'Options are announced without position.',
              },
            ],
          },
        },
      },
    })
    expect(markdown).toContain(
      '| Assistive technology | Failed | 2026-11-01, Accessibility guild, <code>@ghostvue/vue</code> at <code>0.4.0</code> (NVDA 2025.1, Firefox 140, Windows 11): Options are announced without position. <a href="https://example.com/reviews/1">Record</a> |',
    )
    expect(markdown).toContain('| Automated keyboard | Not reviewed |')
  })

  it('lists extra data attributes with their values or presence', () => {
    const markdown = manifestToMarkdown({
      ...manifest,
      styling: {
        ...manifest.styling,
        attributes: [
          {
            name: 'data-orientation',
            values: ['horizontal', 'vertical'],
            description: 'Axis.',
          },
          { name: 'data-disabled', values: [], description: 'Disabled.' },
        ],
      },
    })
    expect(markdown).toContain(
      '| <code>data-orientation</code> | <code>horizontal</code>, <code>vertical</code> | Axis. |',
    )
    expect(markdown).toContain(
      '| <code>data-disabled</code> | present | Disabled. |',
    )
  })

  it('escapes type and prose markup and makes empty sections explicit', () => {
    const markdown = manifestToMarkdown({
      ...manifest,
      description: '<script>{{ value }}</script> | `code`\nnext',
      props: [],
      events: [],
      models: [],
      slots: [],
      exposed: [],
      styling: { parts: [], states: [], cssProperties: [] },
      examples: [],
    })
    expect(markdown).toContain(
      '&lt;script&gt;&#123;&#123; value &#125;&#125;&lt;/script&gt; &#124; &#96;code&#96; next',
    )
    expect(markdown).toContain('## CSS variables\n\nNone declared.')
    expect(markdown).not.toContain('<script>')
  })

  it('generates both packages with distinct paths and removes obsolete pages', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghost-reference-'))
    try {
      for (const directory of ['vue', 'themes']) {
        await mkdir(join(root, 'packages', directory, 'manifests'), {
          recursive: true,
        })
        await writeFile(
          join(
            root,
            'packages',
            directory,
            'manifests/ghost-fixture.manifest.json',
          ),
          JSON.stringify({ ...manifest, package: `@ghostvue/${directory}` }),
        )
      }
      await writeComponentReferences(root)
      expect(
        await readFile(
          join(root, 'docs/reference/vue/ghost-fixture.md'),
          'utf8',
        ),
      ).toContain('@ghostvue/vue')
      expect(
        await readFile(
          join(root, 'docs/reference/themes/ghost-fixture.md'),
          'utf8',
        ),
      ).toContain('@ghostvue/themes')
      expect(
        await readFile(join(root, 'docs/reference/index.md'), 'utf8'),
      ).toContain('./themes/ghost-fixture.md')
      await rm(join(root, 'packages/vue/manifests/ghost-fixture.manifest.json'))
      await writeComponentReferences(root)
      expect(await readdir(join(root, 'docs/reference/vue'))).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
