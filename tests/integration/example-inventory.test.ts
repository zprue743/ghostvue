/** @vitest-environment node */

import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  EXAMPLE_ID,
  EXAMPLE_SOURCE_BLOCK,
  EXAMPLE_TAG,
  expandExampleSnippets,
} from '../../apps/docs/.vitepress/expand-example-snippets'
import { mapOutsideFences } from '../../apps/docs/.vitepress/markdown-fences'
import { ghostExamples } from '../../examples/registry'
import {
  buildExampleInventory,
  collectGuideEmbeds,
  formatExampleInventory,
  isComponentGuideFile,
  readExampleInventory,
  type DocsExampleParsing,
} from '../../scripts/lib/example-inventory.js'

const repositoryRoot = resolve(process.cwd())

// The same transforms the VitePress build applies, imported directly.
const parsing: DocsExampleParsing = {
  expandExampleSnippets,
  mapOutsideFences,
  EXAMPLE_TAG,
  EXAMPLE_SOURCE_BLOCK,
  EXAMPLE_ID,
}

const catalog = [
  { id: 'widget/basic', layer: 'headless' },
  { id: 'widget/advanced', layer: 'headless' },
  { id: 'widget/themed', layer: 'themed' },
  { id: 'helper/basic', layer: 'headless' },
] as const

function inventoryOf(guides: { page: string; markdown: string }[]) {
  return buildExampleInventory({ guides, catalog, parsing })
}

describe('collectGuideEmbeds', () => {
  it('keeps display order and attaches the nearest heading', () => {
    const embeds = collectGuideEmbeds(
      [
        '# GhostWidget',
        '',
        '<GhostExample id="widget/advanced" />',
        '',
        '## Basic use {#basic}',
        '',
        '<GhostExample id="widget/basic" />',
        '',
        '### `size` and density',
        '',
        '<GhostExample id="widget/themed" />',
        '',
      ].join('\n'),
      parsing,
    )

    expect(embeds).toEqual([
      {
        id: 'widget/advanced',
        heading: 'GhostWidget',
        headingDepth: 1,
        wellFormed: true,
      },
      {
        id: 'widget/basic',
        heading: 'Basic use',
        headingDepth: 2,
        wellFormed: true,
      },
      {
        id: 'widget/themed',
        heading: 'size and density',
        headingDepth: 3,
        wellFormed: true,
      },
    ])
  })

  it('skips quoted tags and headings inside backtick and tilde fences', () => {
    const embeds = collectGuideEmbeds(
      [
        '## Real',
        '',
        '```md',
        '## Not a heading',
        '<GhostExample id="widget/themed" />',
        '```',
        '',
        '~~~~md',
        '```',
        '<GhostExample id="widget/advanced" />',
        '```',
        '~~~~',
        '',
        '<GhostExample id="widget/basic" />',
        '',
      ].join('\n'),
      parsing,
    )

    expect(embeds.map(({ id, heading }) => ({ id, heading }))).toEqual([
      { id: 'widget/basic', heading: 'Real' },
    ])
  })

  it('counts a legacy sibling snippet or an expanded host once', () => {
    const embeds = collectGuideEmbeds(
      [
        '<GhostExample id="widget/basic" />',
        '',
        '<<< @/../examples/widget/basic.vue',
        '',
        '<GhostExample id="widget/themed">',
        '',
        '<<< @/../examples/widget/themed.vue',
        '',
        '</GhostExample>',
        '',
      ].join('\n'),
      parsing,
    )

    expect(embeds.map((embed) => embed.id)).toEqual([
      'widget/basic',
      'widget/themed',
    ])
  })

  it('skips embeds and headings inside HTML comments but keeps quoted comments in fences', () => {
    const embeds = collectGuideEmbeds(
      [
        '## Live',
        '',
        '<!-- <GhostExample id="widget/themed" /> -->',
        '',
        '<!--',
        '## Hidden heading',
        '',
        '<GhostExample id="widget/advanced">',
        '',
        '<<< @/../examples/widget/advanced.vue',
        '',
        '</GhostExample>',
        '-->',
        '',
        '<!-- note --> ## Not a heading after a comment',
        '',
        '<GhostExample id="widget/basic" />',
        '',
        '```md',
        '<!-- quoted, not a comment the page hides -->',
        '```',
        '',
        '<!-- unterminated, runs to the end <GhostExample id="helper/basic" />',
        '',
      ].join('\n'),
      parsing,
    )

    expect(embeds).toEqual([
      {
        id: 'widget/basic',
        heading: 'Live',
        headingDepth: 2,
        wellFormed: true,
      },
    ])
  })

  it('ignores front matter comments and reports malformed ids', () => {
    const embeds = collectGuideEmbeds(
      [
        '---',
        '# YAML comment, not a heading',
        'outline: deep',
        '---',
        '',
        '<GhostExample id="Widget/Basic" />',
        '',
      ].join('\n'),
      parsing,
    )

    expect(embeds).toEqual([
      {
        id: 'Widget/Basic',
        heading: null,
        headingDepth: null,
        wellFormed: false,
      },
    ])
  })
})

describe('buildExampleInventory', () => {
  it('distinguishes themed-first, headless-lead, headless-only, and empty guides', () => {
    const inventory = inventoryOf([
      {
        page: 'docs/components/widget.md',
        markdown:
          '<GhostExample id="widget/basic" />\n\n<GhostExample id="widget/themed" />\n',
      },
      {
        page: 'docs/components/themed-widget.md',
        markdown:
          '<GhostExample id="widget/themed" />\n\n<GhostExample id="widget/basic" />\n',
      },
      {
        page: 'docs/components/helper.md',
        markdown: '<GhostExample id="helper/basic" />\n',
      },
      { page: 'docs/components/index.md', markdown: '# Components\n' },
    ])

    const byPage = new Map(inventory.pages.map((page) => [page.page, page]))
    expect(byPage.get('docs/components/widget.md')).toMatchObject({
      kind: 'themed-capable',
      themedFirst: false,
      lead: { id: 'widget/basic', layer: 'headless' },
      counts: { embeds: 2, headless: 1, themed: 1, unresolved: 0 },
    })
    expect(byPage.get('docs/components/themed-widget.md')).toMatchObject({
      kind: 'themed-capable',
      themedFirst: true,
      lead: { id: 'widget/themed', layer: 'themed' },
    })
    expect(byPage.get('docs/components/helper.md')).toMatchObject({
      kind: 'headless-only',
      themedFirst: false,
      counts: { embeds: 1, headless: 1, themed: 0, unresolved: 0 },
    })
    expect(byPage.get('docs/components/index.md')).toMatchObject({
      kind: 'no-examples',
      lead: null,
      counts: { embeds: 0 },
    })
    expect(inventory.totals).toEqual({
      guides: 4,
      themedCapable: 2,
      themedFirst: 1,
      headlessOnly: 1,
      noExamples: 1,
      embeds: 5,
      headless: 3,
      themed: 2,
      unresolved: 0,
    })
  })

  it('does not let a commented-out example change the count, lead, or classification', () => {
    const live = [
      '# GhostWidget',
      '',
      '<GhostExample id="widget/basic" />',
      '',
      '## More',
      '',
      '<GhostExample id="widget/advanced" />',
      '',
    ].join('\n')
    // A themed embed commented out ahead of the lead would, if counted, make
    // the page themed-capable and themed-first with one extra embed.
    const commented = [
      '# GhostWidget',
      '',
      '<!-- <GhostExample id="widget/themed" /> -->',
      '',
      '<GhostExample id="widget/basic" />',
      '',
      '## More',
      '',
      '<!--',
      '<GhostExample id="widget/themed" />',
      '-->',
      '',
      '<GhostExample id="widget/advanced" />',
      '',
    ].join('\n')

    const [withoutComments] = inventoryOf([
      { page: 'docs/components/widget.md', markdown: live },
    ]).pages
    const inventory = inventoryOf([
      { page: 'docs/components/widget.md', markdown: commented },
    ])

    expect(inventory.pages[0]).toEqual(withoutComments)
    expect(inventory.pages[0]).toMatchObject({
      kind: 'headless-only',
      themedFirst: false,
      lead: { id: 'widget/basic', layer: 'headless' },
      counts: { embeds: 2, headless: 2, themed: 0, unresolved: 0 },
      duplicates: [],
    })
    expect(inventory.totals).toMatchObject({
      themedCapable: 0,
      themedFirst: 0,
      headlessOnly: 1,
      embeds: 2,
      themed: 0,
    })
  })

  it('counts every duplicate embed and flags the repeated id', () => {
    const inventory = inventoryOf([
      {
        page: 'docs/components/widget.md',
        markdown:
          '<GhostExample id="widget/basic" />\n\n<GhostExample id="widget/advanced" />\n\n<GhostExample id="widget/basic" />\n',
      },
    ])
    const [page] = inventory.pages

    expect(page?.counts.embeds).toBe(3)
    expect(page?.examples.map((example) => example.position)).toEqual([1, 2, 3])
    expect(page?.duplicates).toEqual([{ id: 'widget/basic', count: 2 }])
    expect(formatExampleInventory(inventory)).toContain(
      'duplicate: widget/basic embedded 2 times',
    )
  })

  it('names the page and id of every embed without registry metadata', () => {
    const inventory = inventoryOf([
      {
        page: 'docs/components/widget.md',
        markdown:
          '<GhostExample id="widget/missing" />\n\n<GhostExample id="widget/basic" />\n\n<GhostExample id="Bad" />\n',
      },
    ])

    expect(inventory.unresolved).toEqual([
      {
        page: 'docs/components/widget.md',
        id: 'widget/missing',
        position: 1,
        reason: 'unknown-id',
      },
      {
        page: 'docs/components/widget.md',
        id: 'Bad',
        position: 3,
        reason: 'malformed-id',
      },
    ])
    // The lead is the first demo a reader can actually see.
    expect(inventory.pages[0]?.lead).toEqual({
      id: 'widget/basic',
      layer: 'headless',
    })
    expect(formatExampleInventory(inventory)).toContain(
      'Unresolved: docs/components/widget.md #1 widget/missing (unknown-id)',
    )
  })

  it('prints byte-identical output regardless of read order', () => {
    const guides = [
      {
        page: 'docs/components/b.md',
        markdown: '<GhostExample id="widget/basic" />\n',
      },
      {
        page: 'docs/components/a.md',
        markdown: '<GhostExample id="helper/basic" />\n',
      },
    ]

    const forward = formatExampleInventory(inventoryOf(guides))
    const reversed = formatExampleInventory(inventoryOf([...guides].reverse()))

    expect(reversed).toBe(forward)
    expect(forward.indexOf('docs/components/a.md')).toBeLessThan(
      forward.indexOf('docs/components/b.md'),
    )
  })
})

describe('isComponentGuideFile', () => {
  it('excludes spec pages and the spec template', () => {
    expect(isComponentGuideFile('data-table.md')).toBe(true)
    expect(isComponentGuideFile('data-table-spec.md')).toBe(false)
    expect(isComponentGuideFile('data-table-virtualization-spec.md')).toBe(
      false,
    )
    expect(isComponentGuideFile('spec-template.md')).toBe(false)
  })
})

describe('readExampleInventory', () => {
  it('reports real guides with registry layers through the Vite-loaded docs transforms', async () => {
    const inventory = await readExampleInventory({
      repositoryRoot,
      pages: ['visually-hidden', 'docs/components/data-table.md'],
    })
    const layers = new Map(
      ghostExamples.map((example) => [example.id, example.layer]),
    )

    expect(inventory.pages.map((page) => page.page)).toEqual([
      'docs/components/data-table.md',
      'docs/components/visually-hidden.md',
    ])
    expect(inventory.unresolved).toEqual([])
    for (const page of inventory.pages) {
      for (const example of page.examples) {
        expect(example.layer).toBe(layers.get(example.id))
      }
    }
    expect(inventory.pages[1]?.kind).toBe('headless-only')
  })

  it('refuses spec pages and unknown guides instead of reporting nothing', async () => {
    await expect(
      readExampleInventory({ repositoryRoot, pages: ['data-table-spec'] }),
    ).rejects.toThrow(
      'Not a component guide: docs/components/data-table-spec.md',
    )
  })
})
