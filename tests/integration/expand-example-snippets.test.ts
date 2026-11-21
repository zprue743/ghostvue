/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import { expandExampleSnippets } from '../../apps/docs/.vitepress/expand-example-snippets'

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

describe('expandExampleSnippets', () => {
  it('moves the canonical snippet into the GhostExample source slot', () => {
    const expanded = expandExampleSnippets(
      'Intro\n\n<GhostExample id="button/themed" />\n\nOutro\n',
    )

    expect(expanded).toBe(
      'Intro\n\n<GhostExample id="button/themed">\n\n' +
        '<<< @/../examples/button/themed.vue\n\n</GhostExample>\n\nOutro\n',
    )
    expect(expanded).not.toContain('<GhostExample id="button/themed" />')
  })

  it('is idempotent and never adds a second snippet', () => {
    const once = expandExampleSnippets(
      '<GhostExample id="button/basic" />\n\n<GhostExample id="button/themed" />\n',
    )
    const twice = expandExampleSnippets(once)

    expect(twice).toBe(once)
    expect(count(twice, '<<< @/../examples/button/basic.vue')).toBe(1)
    expect(count(twice, '<<< @/../examples/button/themed.vue')).toBe(1)
    expect(count(twice, '</GhostExample>')).toBe(2)
  })

  it('absorbs an already-following snippet of the same file instead of duplicating it', () => {
    const expanded = expandExampleSnippets(
      '<GhostExample id="button/basic" />\n\n<<< @/../examples/button/basic.vue\n\nAfter\n',
    )

    expect(expanded).toBe(
      '<GhostExample id="button/basic">\n\n' +
        '<<< @/../examples/button/basic.vue\n\n</GhostExample>\n\nAfter\n',
    )
  })

  it('keeps an unrelated following snippet as authored content', () => {
    const expanded = expandExampleSnippets(
      '<GhostExample id="button/basic" />\n\n<<< @/snippets/other.ts\n',
    )

    expect(count(expanded, '<<< @/../examples/button/basic.vue')).toBe(1)
    expect(expanded).toContain('</GhostExample>\n\n<<< @/snippets/other.ts\n')
  })

  it('leaves quoted GhostExample tags inside fences alone', () => {
    const source = `Docs\n\n\`\`\`md\n<GhostExample id="button/icon-only" />\n\`\`\`\n`

    expect(expandExampleSnippets(source)).toBe(source)
  })

  it('leaves tags with malformed ids for the host to reject', () => {
    const source = '<GhostExample id="Not An Id" />\n'

    expect(expandExampleSnippets(source)).toBe(source)
  })
})
