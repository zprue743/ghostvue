import type { MarkdownRenderer } from 'vitepress'

import { mapOutsideFences } from './markdown-fences'

/** Self-closing live tag that authors (and generated references) write. */
const EXAMPLE_TAG = /<GhostExample\s+id=["']([^"']+)["']\s*\/>/g

/** Path-derived example id (`button/icon-only`). */
export const EXAMPLE_ID = /^[a-z][a-z0-9-]+\/[a-z][a-z0-9-]+$/

/**
 * Expanded host: an open tag, the source slot, and the closing tag. The slot
 * body is lazy so two adjacent examples never merge into one match.
 */
export const EXAMPLE_SOURCE_BLOCK =
  /<GhostExample\s+id=["']([^"']+)["']\s*>[\s\S]*?<\/GhostExample>/g

/**
 * `@/` in VitePress snippets is `srcDir` (`docs/`). One `..` reaches the
 * unpublished `examples/` tree next to it.
 */
function exampleSnippet(id: string): string {
  return `<<< @/../examples/${id}.vue`
}

/**
 * Length of a legacy sibling snippet (`<GhostExample />` followed by the same
 * `<<<` line) so the rewrite can absorb it into the slot instead of rendering
 * the source twice. Other snippets are authored content and stay put.
 */
function followingSnippetLength(after: string, snippet: string): number {
  const match = /^(?:[ \t]*\n)+[ \t]*(<<<[^\n]*)/.exec(after)
  return match?.[1]?.trim() === snippet ? match[0].length : 0
}

/**
 * Rewrite each live `<GhostExample id="…" />` into an open/close pair whose
 * default slot holds a VitePress `<<<` snippet of the same SFC, so Shiki
 * highlights exactly the file the preview mounts and `GhostExample` owns the
 * source disclosure. The blank lines are required: markdown-it only treats the
 * snippet as a block (and the tags as HTML blocks) when they stand alone.
 *
 * Invariants: quoted tags inside fences stay untouched, already-expanded
 * hosts are left alone (re-running is a no-op), and a legacy sibling snippet
 * of the same file is moved into the slot rather than duplicated.
 */
export function expandExampleSnippets(source: string): string {
  return mapOutsideFences(source, (chunk) => {
    let result = ''
    let lastIndex = 0

    for (const match of chunk.matchAll(EXAMPLE_TAG)) {
      const id = match[1]
      if (!id || !EXAMPLE_ID.test(id)) {
        continue
      }

      const snippet = exampleSnippet(id)
      const start = match.index
      const end = start + match[0].length
      const absorbed = followingSnippetLength(chunk.slice(end), snippet)

      result += chunk.slice(lastIndex, start)
      result += `<GhostExample id="${id}">\n\n${snippet}\n\n</GhostExample>`
      lastIndex = end + absorbed
    }

    return result + chunk.slice(lastIndex)
  })
}

/** Open tag of an expanded host as markdown-it emits it (its own html_block). */
const EXAMPLE_HOST_OPEN = /^<GhostExample\s+id=["']([^"']+)["']\s*>\s*$/

/** Close tag of an expanded host. */
const EXAMPLE_HOST_CLOSE = /^<\/GhostExample>\s*$/

/** VitePress's highlighted fence wrapper: one `language-*` div. */
const HIGHLIGHTED_FENCE = /^<div class="(language-[^"]*)">([\s\S]*)<\/div>\s*$/

/** Fence tokens that sit directly in an expanded host's source slot. */
const exampleSourceFences = new WeakSet()

/** Render environments (local search) that need the source as real markup. */
const markupSourceEnvs = new WeakSet()

/**
 * Ask {@link bindExampleSourceHtml}'s fence rule to keep the highlighted
 * markup for this render. Local search indexes text from the rendered HTML,
 * so it must still see the example source.
 */
export function keepExampleSourceMarkup(env: object): void {
  markupSourceEnvs.add(env)
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Turn one rendered highlighted fence into the same wrapper element whose
 * inner HTML is a single `v-html` string literal. Anything that is not a
 * VitePress `language-*` wrapper is returned unchanged.
 */
export function toExampleSourceBinding(html: string): string {
  const match = HIGHLIGHTED_FENCE.exec(html)
  if (!match) {
    return html
  }
  const [, className = '', inner = ''] = match
  // `v-pre` only told Vue not to compile the code; as raw HTML it would land
  // in the DOM as a stray attribute.
  const markup = inner.replace(/(<pre\b[^>]*?) v-pre(?:="")?(?=[\s>])/, '$1')
  const literal = escapeAttribute(JSON.stringify(markup))
  return `<div class="${className}" v-html="${literal}"></div>\n`
}

/**
 * Pass each example's highlighted source into the `GhostExample` slot as one
 * string instead of as template markup.
 *
 * Why: the page SFC is compiled by Vue, and Vue never stringifies static
 * markup inside a component slot (`stringifyStatic` bails when
 * `scopes.vSlot > 0`). Every Shiki token span in the slot therefore became
 * its own `createElementVNode` call in the client bundle, plus a scope-id
 * interpolated SSR push and a vnode fallback in the server bundle. A 10 kB
 * example compiled to about 1.5 MB of client and 2.6 MB of SSR code per page,
 * and Rollup holds all of those ASTs at once, so the docs build ran out of
 * heap. A `v-html` string literal is one AST node per example.
 *
 * The wrapper `<div class="language-*">` stays real markup, so the DOM, the
 * VitePress copy button and `.ghost-example__source > div[class*='language-']`
 * selectors are unchanged. Only fences that are the sole content of an
 * expanded host are rewritten; authored fences elsewhere still compile
 * (and stringify) as before.
 */
export function bindExampleSourceHtml(md: MarkdownRenderer): void {
  md.core.ruler.push('ghost-example-source-fences', (state) => {
    const { tokens } = state
    for (let index = 1; index < tokens.length - 1; index += 1) {
      const open = tokens[index - 1]
      const fence = tokens[index]
      const close = tokens[index + 1]
      if (
        fence?.type === 'fence' &&
        open?.type === 'html_block' &&
        EXAMPLE_HOST_OPEN.test(open.content) &&
        close?.type === 'html_block' &&
        EXAMPLE_HOST_CLOSE.test(close.content)
      ) {
        exampleSourceFences.add(fence)
      }
    }
  })

  const renderFence = md.renderer.rules.fence
  if (!renderFence) {
    throw new Error(
      '[ghost-example] markdown-it has no fence renderer to wrap.',
    )
  }
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const html = renderFence(tokens, idx, options, env, self)
    const token = tokens[idx]
    // markdown-it types `env` as `any`; narrow it before the WeakSet lookup.
    const renderEnv: unknown = env
    const keepMarkup =
      typeof renderEnv === 'object' &&
      renderEnv !== null &&
      markupSourceEnvs.has(renderEnv)
    return token && exampleSourceFences.has(token) && !keepMarkup
      ? toExampleSourceBinding(html)
      : html
  }
}
