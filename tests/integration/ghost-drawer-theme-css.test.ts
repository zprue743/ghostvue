/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-drawer.css')

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function findHardcodedVisuals(css: string) {
  const source = stripComments(css)
  const violations: string[] = []

  for (const match of source.matchAll(/#(?:[0-9a-f]{3,8})\b/gi)) {
    violations.push(match[0])
  }

  for (const match of source.matchAll(
    /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb|color)\(/gi,
  )) {
    violations.push(match[0].replace(/\($/, ''))
  }

  for (const match of source.matchAll(/-?[\d.]+(?:px|ms|s|rem|em)\b/gi)) {
    const value = match[0]
    if (/^0+(?:\.0+)?(?:px|ms|s|rem|em)?$/.test(value)) {
      continue
    }
    violations.push(value)
  }

  return [...new Set(violations)]
}

/** Returns the body of the first `@media <query> { ... }` block. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`)
  if (start === -1) {
    return ''
  }
  let depth = 0
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) {
        return css.slice(start, index + 1)
      }
    }
  }
  return ''
}

describe('GhostDrawer theme CSS tokens', () => {
  it('uses semantic --ghost-* tokens with no hardcoded visual literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('@layer ghostvue-theme')
    expect(css).toContain('background-color: var(--ghost-scrim);')
    for (const token of [
      '--ghost-elevation-4-bg',
      '--ghost-elevation-4-border',
      '--ghost-elevation-4-shadow',
      '--ghost-elevation-4-highlight',
      '--ghost-radius-lg',
      '--ghost-border-hairline-width',
      '--ghost-surface-fg',
      '--ghost-space-inset-lg',
      '--ghost-space-gap-md',
      '--ghost-focus-ring-color',
    ]) {
      expect(css).toContain(token)
    }
    expect(css).toContain('overscroll-behavior: contain')
    expect(css).toContain('100dvh')
    expect(css).toContain('100dvw')
    expect(stripComments(css)).not.toMatch(/animation|inset-inline/i)
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('maps logical sides to physical edges from data-dir', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toMatch(
      /\[data-side='start'\]\[data-dir='ltr'\],\s*\[data-side='end'\]\[data-dir='rtl'\]/,
    )
    expect(css).toMatch(
      /\[data-side='end'\]\[data-dir='ltr'\],\s*\[data-side='start'\]\[data-dir='rtl'\]/,
    )
    expect(css).toContain('left: 0;')
    expect(css).toContain('right: 0;')
    expect(css).toContain('top: 0;')
    expect(css).toContain('bottom: 0;')
  })

  it('slides in with @starting-style only when motion is allowed', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const motion = mediaBlock(css, '(prefers-reduced-motion: no-preference)')
    expect(motion).toContain('@starting-style')
    expect(motion).toContain('translate: -100% 0;')
    expect(motion).toContain('translate: 100% 0;')
    expect(motion).toContain('translate: 0 -100%;')
    expect(motion).toContain('translate: 0 100%;')
    expect(motion).toContain('var(--ghost-motion-enter-duration)')
    expect(motion).toContain('var(--ghost-motion-enter-easing)')

    const reduced = mediaBlock(css, '(prefers-reduced-motion: reduce)')
    expect(reduced).toContain('@starting-style')
    expect(reduced).toContain('translate: none;')
    expect(reduced).not.toMatch(/translate: -?100%/)
    expect(reduced).toContain('var(--ghost-motion-fade-duration)')
    expect(reduced).toContain('var(--ghost-motion-easing-standard)')

    // Translation must never appear outside the no-preference block.
    const outside = css.replace(motion, '')
    expect(outside).not.toMatch(/translate: -?(?:0 )?-?100%/)
  })

  it('supports forced colors', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const forced = mediaBlock(css, '(forced-colors: active)')
    expect(forced).toContain('Canvas')
    expect(forced).toContain('CanvasText')
    expect(forced).toContain('box-shadow: none')
    expect(forced).toContain('Highlight')
  })
})
