import type { MarkdownEnv } from 'vitepress'

import { keepExampleSourceMarkup } from './expand-example-snippets'

interface LocalSearchMarkdown {
  render(src: string, env: MarkdownEnv): string
}

/**
 * Paths indexed for humans but omitted from local search (still built and linked).
 */
const SEARCH_EXCLUDED_PREFIXES = ['standards/', 'agents/'] as const

function isSearchExcludedPath(relativePath: string): boolean {
  if (
    SEARCH_EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  ) {
    return true
  }
  if (
    relativePath.startsWith('components/') &&
    relativePath.endsWith('-spec.md')
  ) {
    return true
  }
  return false
}

/**
 * VitePress local-search hook: render markdown for the index and drop internal pages.
 * Uses `md.render` like VitePress's default indexer; `env.frontmatter` is set during render.
 */
export function renderLocalSearchDocument(
  src: string,
  env: MarkdownEnv,
  md: LocalSearchMarkdown,
): string {
  // Index example source text, not the page build's `v-html` string binding.
  keepExampleSourceMarkup(env)
  const html = md.render(src, env)
  if (env.frontmatter?.search === false) {
    return ''
  }
  if (isSearchExcludedPath(env.relativePath)) {
    return ''
  }
  return html
}
