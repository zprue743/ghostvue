/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(
  process.cwd(),
  'packages/themes/src/ghost-number-input.css',
)

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

describe('GhostNumberInput theme CSS', () => {
  it('uses semantic --ghost-* tokens with no hardcoded visual literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-control-size-md-min')
    expect(css).toContain('--ghost-focus-ring-color')
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('scales both input and buttons via root size tokens and uses child combinators', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toContain(".ghost-number-input[data-size='sm']")
    expect(css).toContain(".ghost-number-input[data-size='lg']")
    expect(css).toMatch(
      /\.ghost-number-input\s*>\s*\.ghost-number-input__input/,
    )
    expect(css).toMatch(
      /\.ghost-number-input\s*>\s*\.ghost-number-input__button/,
    )
    expect(css).toContain(
      'min-block-size: var(--_ghost-number-input-min-size);',
    )
    expect(css).toContain(
      'min-inline-size: var(--_ghost-number-input-min-size);',
    )
  })

  it('draws a real outline focus ring and supports forced-colors mode', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).not.toContain('outline: none;')
    expect(css).toContain(
      'outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color);',
    )
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('outline-color: Highlight;')
    expect(css).toContain('box-shadow: none;')
  })
})
