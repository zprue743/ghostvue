import { describe, expect, it } from 'vitest'

import { expandExampleSnippets } from '../../apps/docs/.vitepress/expand-example-snippets'

describe('expandExampleSnippets', () => {
  it('appends a VitePress snippet after a live GhostExample tag', () => {
    const expanded = expandExampleSnippets(
      'Intro\n\n<GhostExample id="button/themed" />\n\nOutro\n',
    )

    expect(expanded).toContain('<GhostExample id="button/themed" />')
    expect(expanded).toContain('<<< @/../examples/button/themed.vue')
    expect(expanded).toContain('<<< @/../examples/button/themed.vue\n\nOutro\n')
  })

  it('is idempotent when the snippet is already present', () => {
    const once = expandExampleSnippets('<GhostExample id="button/basic" />\n')
    const twice = expandExampleSnippets(once)

    expect(twice).toBe(once)
    expect(twice.match(/<<< @\/\.\.\/examples\/button\/basic\.vue/g)).toEqual([
      '<<< @/../examples/button/basic.vue',
    ])
  })

  it('leaves quoted GhostExample tags inside fences alone', () => {
    const source = `Docs\n\n\`\`\`md\n<GhostExample id="button/icon-only" />\n\`\`\`\n`

    expect(expandExampleSnippets(source)).toBe(source)
  })
})
