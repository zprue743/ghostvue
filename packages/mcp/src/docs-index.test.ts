/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  buildDocsIndex,
  type DocsPage,
  searchDocsIndex,
  snippetFor,
  snippetMaxLength,
  tokenizeQuery,
} from './docs-index.js'

function page(overrides: Partial<DocsPage> & { link: string }): DocsPage {
  return {
    section: 'Docs',
    title: 'Untitled',
    description: '',
    body: '',
    ...overrides,
  }
}

function search(
  pages: readonly DocsPage[],
  query: string,
  options: { limit?: number; section?: string } = {},
) {
  return searchDocsIndex(buildDocsIndex(pages), {
    terms: tokenizeQuery(query),
    limit: options.limit ?? 10,
    section: options.section,
  })
}

const filler = 'Unrelated prose about layout and spacing. '

describe('tokenizeQuery', () => {
  it('splits on whitespace and drops tokens shorter than two characters', () => {
    expect(tokenizeQuery('  a focus\ttrap \n x ')).toEqual(['focus', 'trap'])
  })

  it('lowercases, strips surrounding punctuation, and removes duplicates', () => {
    expect(tokenizeQuery('Button, (button) BUTTON!')).toEqual(['button'])
  })

  it('keeps identifiers joined by dots, hyphens, and underscores whole', () => {
    expect(tokenizeQuery('v-model action.primary.bg use_id')).toEqual([
      'v-model',
      'action.primary.bg',
      'use_id',
    ])
  })

  it('returns no terms when every token is too short', () => {
    expect(tokenizeQuery('a b c')).toEqual([])
  })
})

describe('searchDocsIndex', () => {
  it('drops pages that do not contain any query term', () => {
    const hits = search(
      [
        page({ link: '/a', body: 'focus trap' }),
        page({ link: '/b', body: 'nothing relevant here' }),
      ],
      'focus',
    )

    expect(hits.map((hit) => hit.link)).toEqual(['/a'])
  })

  it('matches whole terms only, without stemming or typo tolerance', () => {
    const pages = [page({ link: '/a', body: 'buttons and button-group' })]

    expect(search(pages, 'button')).toEqual([])
    expect(search(pages, 'buton')).toEqual([])
    expect(search(pages, 'buttons')).toHaveLength(1)
  })

  it('weights a title match above a description match above a body match', () => {
    const hits = search(
      [
        page({ link: '/body', title: 'Alpha', body: `dialog ${filler}` }),
        page({
          link: '/description',
          title: 'Beta',
          description: 'dialog',
          body: filler,
        }),
        page({ link: '/title', title: 'Dialog', body: filler }),
      ],
      'dialog',
    )

    expect(hits.map((hit) => hit.link)).toEqual([
      '/title',
      '/description',
      '/body',
    ])
  })

  it('ranks a rare term above a common one (inverse document frequency)', () => {
    const hits = search(
      [
        page({ link: '/common-1', body: `common ${filler}` }),
        page({ link: '/common-2', body: `common ${filler}` }),
        page({ link: '/common-3', body: `common ${filler}` }),
        page({ link: '/rare', body: `rare ${filler}` }),
      ],
      'common rare',
    )

    expect(hits[0]?.link).toBe('/rare')
  })

  it('ranks a page matching more query terms higher', () => {
    const hits = search(
      [
        page({ link: '/one', body: `focus ${filler}` }),
        page({ link: '/both', body: `focus trap ${filler}` }),
      ],
      'focus trap',
    )

    expect(hits.map((hit) => hit.link)).toEqual(['/both', '/one'])
  })

  it('favors the shorter page when term counts are equal (length normalization)', () => {
    const hits = search(
      [
        page({ link: '/long', body: `toast ${filler.repeat(20)}` }),
        page({ link: '/short', body: `toast ${filler}` }),
      ],
      'toast',
    )

    expect(hits.map((hit) => hit.link)).toEqual(['/short', '/long'])
  })

  it('breaks score ties by sidebar section order, then link path', () => {
    const same = { title: 'Same', body: 'tie' }
    const hits = search(
      [
        page({ ...same, section: 'Theming', link: '/z/theming' }),
        page({ ...same, section: 'Contribute', link: '/b/second' }),
        page({ ...same, section: 'Contribute', link: '/a/first' }),
      ],
      'tie',
    )

    expect(hits.map((hit) => hit.link)).toEqual([
      '/z/theming',
      '/a/first',
      '/b/second',
    ])
    expect(new Set(hits.map((hit) => hit.score)).size).toBe(1)
  })

  it('filters by section without changing scores', () => {
    const pages = [
      page({ section: 'Docs', link: '/docs', body: `menu ${filler}` }),
      page({ section: 'Components', link: '/menu', title: 'Menu' }),
      page({ section: 'Components', link: '/other', body: filler }),
    ]

    const all = search(pages, 'menu')
    const components = search(pages, 'menu', { section: 'Components' })

    expect(components).toEqual(
      all.filter((hit) => hit.section === 'Components'),
    )
    expect(components.map((hit) => hit.link)).toEqual(['/menu'])
  })

  it('caps the results at limit after sorting', () => {
    const pages = ['/c', '/a', '/b'].map((link) => page({ link, body: 'term' }))

    expect(search(pages, 'term', { limit: 2 }).map((hit) => hit.link)).toEqual([
      '/a',
      '/b',
    ])
  })

  it('returns no hits for a query without usable terms', () => {
    expect(search([page({ link: '/a', body: 'a b c' })], 'a')).toEqual([])
  })

  it('returns positive scores rounded to three decimals', () => {
    const [hit] = search([page({ link: '/a', body: 'term' })], 'term')

    expect(hit?.score).toBeGreaterThan(0)
    expect(hit?.score).toBe(Math.round((hit?.score ?? 0) * 1000) / 1000)
  })
})

describe('snippetFor', () => {
  it('returns short plain text whole, without markdown headings or comments', () => {
    const snippet = snippetFor(
      page({
        link: '/a',
        body: '<!-- Generated. -->\n\n# Title\n\nFirst   line.\nSecond line.',
      }),
      ['second'],
    )

    expect(snippet).toBe('Title First line. Second line.')
  })

  it('cuts a window around the first match with ellipses on both sides', () => {
    const body = `${filler.repeat(10)}The keyboard section. ${filler.repeat(10)}`
    const snippet = snippetFor(page({ link: '/a', body }), ['keyboard'])

    expect(snippet.length).toBeLessThanOrEqual(snippetMaxLength)
    expect(snippet.startsWith('…')).toBe(true)
    expect(snippet.endsWith('…')).toBe(true)
    expect(snippet).toContain('The keyboard section.')
    // Both cuts land on word boundaries.
    expect(body).toContain(` ${snippet.slice(1, -1)} `)
  })

  it('uses the first occurrence of any query term', () => {
    const body = `${filler.repeat(10)}alpha ${filler.repeat(10)}beta ${filler.repeat(10)}`
    const snippet = snippetFor(page({ link: '/a', body }), ['beta', 'alpha'])

    expect(snippet).toContain('alpha')
    expect(snippet).not.toContain('beta')
  })

  it('starts at the beginning when the match is near the start', () => {
    const body = `Intro keyword here. ${filler.repeat(20)}`
    const snippet = snippetFor(page({ link: '/a', body }), ['keyword'])

    expect(snippet.startsWith('Intro keyword')).toBe(true)
    expect(snippet.endsWith('…')).toBe(true)
    expect(snippet.length).toBeLessThanOrEqual(snippetMaxLength)
  })

  it('fills the window backwards when the match is near the end', () => {
    const body = `${filler.repeat(20)}final keyword`
    const snippet = snippetFor(page({ link: '/a', body }), ['keyword'])

    expect(snippet.startsWith('…')).toBe(true)
    expect(snippet.endsWith('final keyword')).toBe(true)
    expect(snippet.length).toBeGreaterThan(snippetMaxLength - 50)
    expect(snippet.length).toBeLessThanOrEqual(snippetMaxLength)
  })

  it('falls back to a matching description, then to the opening of the body', () => {
    const body = filler.repeat(20)

    expect(
      snippetFor(page({ link: '/a', description: 'About popovers.', body }), [
        'popovers',
      ]),
    ).toBe('About popovers.')
    const titleOnly = snippetFor(page({ link: '/a', title: 'Popover', body }), [
      'popover',
    ])
    expect(titleOnly.startsWith('Unrelated prose')).toBe(true)
    expect(titleOnly.length).toBeLessThanOrEqual(snippetMaxLength)
  })

  it('hard-cuts a word longer than the window at the limit', () => {
    const body = `match ${'x'.repeat(1000)}`
    const snippet = snippetFor(page({ link: '/a', body }), ['match'])

    expect(snippet.length).toBe(snippetMaxLength)
    expect(snippet.endsWith('…')).toBe(true)
  })
})
