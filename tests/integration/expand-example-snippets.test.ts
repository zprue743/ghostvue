/** @vitest-environment node */

import { fileURLToPath } from 'node:url'

import { createMarkdownRenderer } from 'vitepress'
import { beforeAll, describe, expect, it } from 'vitest'
import { compileTemplate } from 'vue/compiler-sfc'

import {
  bindExampleSourceHtml,
  expandExampleSnippets,
  keepExampleSourceMarkup,
  toExampleSourceBinding,
} from '../../apps/docs/.vitepress/expand-example-snippets'

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

/*
 * The docs build compiles each page as a Vue SFC. Vue never stringifies
 * static markup inside a component slot, so a highlighted example in the
 * `GhostExample` slot used to compile to one vnode call per Shiki token and
 * pushed the docs build out of heap (GHO-220). These tests pin the binding
 * that keeps the slot a single string while the DOM stays the same.
 */
describe('bindExampleSourceHtml', () => {
  const docsRoot = fileURLToPath(new URL('../../docs', import.meta.url))
  const page =
    'Intro\n\n<GhostExample id="button/themed" />\n\n```ts\nconst authored = 1\n```\n'
  let render: (options?: { keepMarkup?: boolean }) => string

  beforeAll(async () => {
    const md = await createMarkdownRenderer(docsRoot, {
      config(instance) {
        instance.core.ruler.before(
          'normalize',
          'ghost-example-snippets',
          (state) => {
            state.src = expandExampleSnippets(state.src)
          },
        )
        bindExampleSourceHtml(instance)
      },
    })
    render = ({ keepMarkup = false } = {}) => {
      const env = {
        path: `${docsRoot}/components/button.md`,
        relativePath: 'components/button.md',
        cleanUrls: true,
      }
      if (keepMarkup) keepExampleSourceMarkup(env)
      return md.render(page, env)
    }
  }, 60_000)

  const ENTITIES: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x3C;': '<',
    '&amp;': '&',
  }

  // One pass: tags are dropped and entities decoded in the same scan, so a
  // decoded `<` is never re-read as markup (chained replaces could do that).
  function textOf(html: string): string {
    return html.replace(
      /<[^>]*>|&(?:lt|gt|quot|amp|#x3C);/g,
      (token) => ENTITIES[token] ?? '',
    )
  }

  it('binds the host source as one v-html string with the same wrapper', () => {
    const html = render()
    const host =
      /<GhostExample id="button\/themed">([\s\S]*?)<\/GhostExample>/.exec(
        html,
      )?.[1]

    expect(host?.trim()).toMatch(
      /^<div class="language-vue vp-adaptive-theme" v-html="[^"]+"><\/div>$/,
    )
  })

  it('compiles the slot to one element instead of a vnode per token', () => {
    const { code } = compileTemplate({
      source: `<div>${render()}</div>`,
      filename: 'button.md.vue',
      id: 'button-md',
    })

    expect(code).toContain(
      'innerHTML: "<button title=\\"Copy Code\\" class=\\"copy\\">',
    )
    expect(code).not.toContain('--shiki-light":')
    expect(code).not.toContain('v-pre')
  })

  it('shows the same code text as the markup render, which search keeps', () => {
    const markup = render({ keepMarkup: true })
    const markupHost =
      /<GhostExample id="button\/themed">([\s\S]*?)<\/GhostExample>/.exec(
        markup,
      )?.[1]
    const bound = /v-html="([^"]+)"/.exec(render())?.[1] ?? ''
    const inner = JSON.parse(
      bound
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    ) as string

    expect(markupHost).toContain('<span style="--shiki-light:')
    expect(textOf(inner).trim()).toBe(textOf(markupHost ?? '').trim())
    expect(textOf(inner)).toContain('<script setup lang="ts">')
  })

  it('leaves authored fences outside a host as compiled markup', () => {
    expect(render()).toMatch(
      /<div class="language-ts vp-adaptive-theme"><button title="Copy Code"/,
    )
  })

  it('returns non-wrapper fence output unchanged', () => {
    expect(toExampleSourceBinding('<pre><code>x</code></pre>')).toBe(
      '<pre><code>x</code></pre>',
    )
  })
})
