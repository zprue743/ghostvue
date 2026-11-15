import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Map `docs/components/<slug>-spec.md` sources onto `/specs/<slug>` routes without
 * moving markdown files. Relative links inside specs keep resolving under rewrites.
 */
export function buildSpecRewrites(docsRoot: string): Record<string, string> {
  const componentsDir = join(docsRoot, 'components')
  const rewrites: Record<string, string> = {
    'adr/README.md': 'adr/index.md',
  }

  for (const name of readdirSync(componentsDir)) {
    const match = /^(.+)-spec\.md$/.exec(name)
    if (!match) continue
    const slug = match[1] ?? ''
    if (!slug) continue
    rewrites[`components/${name}`] = `specs/${slug}.md`
  }

  return rewrites
}
