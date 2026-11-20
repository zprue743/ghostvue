/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/*
 * Static guards for the themed tab strip. The browser behavior (hover tint,
 * disabled treatment, forced colors) is asserted in
 * tests/e2e/docs-tabs-showcase.spec.ts; these checks keep the recipe on
 * semantic tokens and pin the selectors that behavior depends on.
 */
const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-tabs.css')

async function readCss(): Promise<string> {
  const css = await readFile(cssPath, 'utf8')
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
}

/** Returns the body of the first `@media <query> { ... }` block. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`)
  if (start === -1) return ''
  let depth = 0
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(start, index + 1)
    }
  }
  return ''
}

describe('GhostTabs theme CSS', () => {
  it('uses semantic tokens with no hardcoded colors or lengths', async () => {
    const css = await readCss()
    expect(css).toContain('@layer ghostvue-theme')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/i)
    expect(css).not.toMatch(/(?<![\w-])[1-9][\d.]*(?:px|rem|em|ms|s)\b/)
  })

  it('tints only enabled, unselected tabs on hover', async () => {
    const css = await readCss()
    expect(css).toContain(
      ".ghost-tabs-trigger[data-themed][data-state='inactive']:hover ):where(:not(:disabled, [aria-disabled='true']))",
    )
    expect(css).toContain('var(--ghost-state-layer-hover)')
  })

  it('dims disabled tabs and rings the focused panel', async () => {
    const css = await readCss()
    expect(css).toContain(
      ".ghost-tabs-trigger[data-themed]:is(:disabled, [aria-disabled='true'])",
    )
    expect(css).toContain('var(--ghost-action-disabled-opacity)')
    expect(css).toContain('.ghost-tabs-content[data-themed]:focus-visible')
  })

  it('paints the active tab with Highlight in forced colors', async () => {
    const forced = mediaBlock(await readCss(), '(forced-colors: active)')
    expect(forced).toContain('background-color: Highlight')
    expect(forced).toContain('color: HighlightText')
    expect(forced).toContain('forced-color-adjust: none')
  })
})
