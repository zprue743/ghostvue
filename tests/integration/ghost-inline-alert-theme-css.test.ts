/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(
  process.cwd(),
  'packages/themes/src/ghost-inline-alert.css',
)

const allowedExact = new Set(['0', '0px', '0ms', '0s', '0%', '50%', '100%'])

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

describe('GhostInlineAlert theme CSS tokens', () => {
  it('does not hard-code colors, px, or time literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--ghost-action-danger-bg')
    expect(css).toContain('--ghost-radius-md')
    expect(css).toContain('--ghost-type-size-sm')
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('uses contrast foreground for solid alerts, child combinators for parts, and CanvasText in forced-colors', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toContain(
      '--_ghost-inline-alert-title-color: var(--_ghost-inline-alert-tone-contrast);',
    )
    expect(css).toContain('--_ghost-inline-alert-message-color: var(')
    expect(css).not.toContain('85%')
    expect(css).toMatch(/\.ghost-inline-alert\s*>\s*\[data-part='title'\]/)
    expect(css).toMatch(/\.ghost-inline-alert\s*>\s*\[data-part='message'\]/)
    expect(css).toMatch(/\.ghost-inline-alert\s*>\s*\[data-part='actions'\]/)
    expect(css).not.toMatch(/\.ghost-inline-alert\s+\[data-part=/)
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('--_ghost-inline-alert-title-color: CanvasText;')
    expect(css).toContain('--_ghost-inline-alert-message-color: CanvasText;')
  })
})
