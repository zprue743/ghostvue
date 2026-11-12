import { mapOutsideFences } from './markdown-fences'

const EXAMPLE_TAG = /<GhostExample\s+id=["']([^"']+)["']\s*\/>/g
const EXAMPLE_ID = /^[a-z][a-z0-9-]+\/[a-z][a-z0-9-]+$/

/**
 * `@/` in VitePress snippets is `srcDir` (`docs/`). One `..` reaches the
 * unpublished `examples/` tree next to it.
 */
function exampleSnippet(id: string): string {
  return `<<< @/../examples/${id}.vue`
}

function followingSnippet(after: string): string | undefined {
  const match = /^(?:[ \t]*\n)+[ \t]*(<<<[^\n]*)/.exec(after)
  return match?.[1]?.trim()
}

/**
 * Append a VitePress `<<<` snippet after each live `<GhostExample>` so Shiki
 * highlights the same SFC the preview mounts. Quoted tags inside fences stay
 * untouched. Re-running the rewrite is a no-op.
 */
export function expandExampleSnippets(source: string): string {
  return mapOutsideFences(source, (chunk) => {
    EXAMPLE_TAG.lastIndex = 0
    let result = ''
    let lastIndex = 0

    for (const match of chunk.matchAll(EXAMPLE_TAG)) {
      const id = match[1]
      const start = match.index
      const end = start + match[0].length
      result += chunk.slice(lastIndex, end)
      lastIndex = end

      if (!id || !EXAMPLE_ID.test(id)) {
        continue
      }

      const snippet = exampleSnippet(id)
      if (followingSnippet(chunk.slice(end)) === snippet) {
        continue
      }

      result += `\n\n${snippet}`
    }

    return result + chunk.slice(lastIndex)
  })
}
