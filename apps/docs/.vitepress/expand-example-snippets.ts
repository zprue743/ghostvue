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
