/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-tree.css')

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

describe('GhostTree theme CSS', () => {
  it('uses semantic --ghost-* tokens with no hardcoded visual literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('@layer ghostvue-theme')
    for (const token of [
      '--ghost-surface-fg',
      '--ghost-surface-muted-bg',
      '--ghost-elevation-2-bg',
      '--ghost-radius-sm',
      '--ghost-space-inset-xs',
      '--ghost-space-inset-sm',
      '--ghost-space-inset-md',
      '--ghost-focus-ring-width',
      '--ghost-focus-ring-color',
      '--ghost-focus-ring-offset',
      '--ghost-action-disabled-opacity',
      '--ghost-motion-duration-moderate',
      '--ghost-motion-easing-standard',
    ]) {
      expect(css).toContain(token)
    }
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('indents with logical padding from --ghost-tree-level', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const indent = css.replace(/\s+/g, ' ')
    expect(indent).toContain(
      'padding-inline-start: calc( var(--ghost-space-inset-sm) + (var(--ghost-tree-level, 1) - 1) * var(--ghost-space-inset-md) )',
    )
    expect(css).not.toMatch(/padding-left|padding-right|margin-left/)
    expect(css).toMatch(/list-style: none/)
  })

  it('draws focus on the item row, never around the expanded group', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toContain(
      '.ghost-tree-item:focus-visible > .ghost-tree-trigger',
    )
    expect(css).toContain(
      '.ghost-tree-item:focus-visible:not(:has(> .ghost-tree-trigger))',
    )
    expect(css).not.toMatch(/\.ghost-tree-item:focus-visible\s*[,{]/)
  })

  it('animates groups only when motion is allowed and supports forced colors', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const motion = mediaBlock(css, '(prefers-reduced-motion: no-preference)')
    expect(motion).toContain('@starting-style')
    expect(motion).toContain("[data-animation='off']")
    expect(motion).toContain('transition: block-size')
    const outside = css.replace(motion, '')
    expect(outside).not.toMatch(/transition:/)

    const forced = mediaBlock(css, '(forced-colors: active)')
    expect(forced).toContain('Highlight')
    expect(forced).toContain('HighlightText')
    expect(forced).toContain('GrayText')
  })
})
