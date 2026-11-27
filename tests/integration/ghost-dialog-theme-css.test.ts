/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-dialog.css')

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

describe('GhostDialog theme CSS tokens', () => {
  it('uses semantic --ghost-* tokens and limits motion to entry', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('background-color: var(--ghost-scrim);')
    expect(css).toContain('--ghost-elevation-4-bg')
    expect(css).toContain('--ghost-elevation-4-border')
    expect(css).toContain('--ghost-elevation-4-shadow')
    expect(css).toContain('--ghost-elevation-4-highlight')
    expect(css).toContain('--ghost-radius-lg')
    expect(css).toContain('--ghost-space-inset-lg')
    expect(css).toContain('--ghost-space-gap-md')
    expect(css).toContain('@starting-style')
    expect(stripComments(css)).not.toMatch(
      /\banimation\b|\[data-state='closed'\]/,
    )
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('centers with physical offsets so the translate() matches in RTL', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    // translate(-50%, -50%) is physical; a logical inline inset would flip to
    // `right` under dir="rtl" and push the surface off-screen.
    expect(css).toContain('transform: translate(-50%, -50%);')
    expect(css).toMatch(/\bleft: 50%;/)
    expect(css).toMatch(/\btop: 50%;/)
    expect(css).not.toMatch(/inset-inline-start/)
  })

  it('scopes title and description selectors to direct children or dialog part classes', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toMatch(
      /\.ghost-dialog-content(?:\[data-themed\])?\s*>\s*\[data-part='title'\]/,
    )
    expect(css).toMatch(
      /\.ghost-dialog-content(?:\[data-themed\])?\s*>\s*\[data-part='description'\]/,
    )
    expect(css).toContain('.ghost-dialog-title')
    expect(css).toContain('.ghost-dialog-description')
    expect(css).not.toMatch(
      /\.ghost-dialog-content(?:\[data-themed\])?\s+\[data-part=/,
    )
  })
})
