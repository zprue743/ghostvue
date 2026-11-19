/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-table.css')

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

describe('GhostTable theme CSS tokens', () => {
  it('uses semantic --ghost-* tokens with no hard-coded colors, px, or time literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-border-default')
    expect(css).toContain('--ghost-surface-muted-bg')
    expect(css).toContain('overflow-x: auto')
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('gives the scroll region a token focus ring drawn inside its box', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const rule =
      /\.ghost-table-scroll-container:focus-visible[^{]*\{([^}]*)\}/.exec(css)
    expect(rule?.[1]).toContain(
      'outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color)',
    )
    // Inset offset: ancestors that clip overflow cannot cut the ring off.
    expect(rule?.[1]).toContain(
      'outline-offset: calc(-1 * var(--ghost-focus-ring-width))',
    )
  })

  it('keeps body and foot row headers off the column header band', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const rule =
      /:is\(\.ghost-table-body, \.ghost-table-foot\)\s*>\s*\.ghost-table-row\s*>\s*\.ghost-table-header-cell[^{]*\{([^}]*)\}/.exec(
        css,
      )
    expect(rule?.[1]).toContain('background-color: transparent')
    expect(rule?.[1]).toContain('vertical-align: top')
  })
})
