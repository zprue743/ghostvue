/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-field.css')

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

describe('GhostField theme CSS', () => {
  it('uses semantic --ghost-* tokens with no hardcoded visual literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-space-stack-sm')
    expect(css).toContain('--ghost-status-danger-fg')
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('targets only direct field parts via child combinators', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toMatch(/\.ghost-field\s*>\s*\[data-part='label'\]/)
    expect(css).toMatch(/\.ghost-field\s*>\s*\[data-part='description'\]/)
    expect(css).toMatch(/\.ghost-field\s*>\s*\[data-part='error'\]/)
    expect(css).toMatch(
      /\[data-part='label'\]\s*>\s*\[data-part='required-indicator'\]/,
    )
    expect(css).not.toMatch(/\.ghost-field(?:\[[^\]]*\])?\s+\[data-part=/)
  })
})
