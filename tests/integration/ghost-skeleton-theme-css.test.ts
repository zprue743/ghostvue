/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-skeleton.css')

const allowedExact = new Set([
  '0',
  '0px',
  '0ms',
  '0s',
  '0%',
  '50%',
  '100%',
  '-100%',
])

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
    if (allowedExact.has(value) || /^0+(?:\.0+)?(?:px|ms|s)$/.test(value)) {
      continue
    }
    violations.push(value)
  }

  return [...new Set(violations)]
}

describe('GhostSkeleton theme CSS tokens', () => {
  it('uses semantic --ghost-* tokens and stops shimmer under reduced motion', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-surface-muted-bg')
    expect(css).toContain('--ghost-surface-subtle-bg')
    expect(css).toContain('--ghost-motion-duration-expressive')
    expect(css).toContain('--ghost-radius-sm')
    expect(css).toContain('--ghost-type-size-md')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('display: table-cell')
    expect(findHardcodedVisuals(css)).toEqual([])
  })
})
