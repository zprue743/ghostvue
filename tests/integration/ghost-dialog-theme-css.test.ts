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
  it('uses semantic --ghost-* tokens and no exit animations or extra literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('background-color: var(--ghost-scrim);')
    expect(css).toContain('--ghost-elevation-4-bg')
    expect(css).toContain('--ghost-elevation-4-border')
    expect(css).toContain('--ghost-elevation-4-shadow')
    expect(css).toContain('--ghost-elevation-4-highlight')
    expect(css).toContain('--ghost-radius-lg')
    expect(css).toContain('--ghost-space-inset-lg')
    expect(css).toContain('--ghost-space-gap-md')
    expect(stripComments(css)).not.toMatch(/animation|transition/i)
    expect(findHardcodedVisuals(css)).toEqual([])
  })
})
