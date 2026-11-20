/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-select.css')

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

describe('GhostSelect theme CSS tokens', () => {
  it('uses semantic --ghost-* tokens with no hard-coded colors, px, or time literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-surface-bg')
    expect(css).toContain('--ghost-border-default')
    expect(css).toContain('--ghost-action-radius')
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('truncates the value part and keeps visual states free of layout changes', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    // The value is the trigger's own part (child combinator), so a long label
    // ends with an ellipsis instead of wrapping the trigger taller.
    expect(css).toMatch(
      /\.ghost-select-trigger > \[data-part='value'\][^{]*\{[^}]*min-inline-size: 0;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/,
    )
    // Keyboard focus gets the token ring, not the browser default outline.
    expect(css).toMatch(/\.ghost-select-trigger:focus-visible/)
    expect(css).toMatch(/\.ghost-select-trigger\[aria-invalid='true'\]/)
    expect(css).toMatch(/--ghost-border-danger/)
    expect(css).toMatch(/--ghost-action-disabled-bg/)
    // Long option labels wrap within the viewport.
    expect(css).toMatch(/max-inline-size: calc\(100vw/)
    expect(css).toMatch(/overflow-wrap: anywhere;/)

    // Hover, focus, and invalid rules only recolor: no size, padding, or
    // border-width changes that would shift the control.
    for (const block of css.matchAll(
      /:(?:hover|focus-visible)[^{]*\{([^}]*)\}|\[aria-invalid='true'\][^{]*\{([^}]*)\}/g,
    )) {
      const body = block[1] ?? block[2] ?? ''
      expect(body).not.toMatch(
        /padding|border-width|inline-size|block-size|margin/,
      )
    }
  })
})
