/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(
  process.cwd(),
  'packages/themes/src/ghost-file-upload.css',
)
const importsPath = resolve(
  process.cwd(),
  'packages/themes/src/.registries/component-imports.generated.css',
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

/** Every selector inside `:where(...)` lists. */
function selectors(css: string): string[] {
  const list: string[] = []
  for (const match of css.matchAll(/:where\(([^{]*?)\)\s*\{/g)) {
    for (const selector of (match[1] ?? '').split(',')) {
      list.push(selector.replace(/\s+/g, ' ').trim())
    }
  }
  return list
}

describe('GhostFileUpload theme CSS', () => {
  it('is loaded by the default stylesheet', async () => {
    const imports = await readFile(importsPath, 'utf8')
    expect(imports).toContain("@import '../ghost-file-upload.css';")
  })

  it('uses semantic --ghost-* tokens with no hardcoded visual literals', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('@layer ghostvue-theme')
    for (const token of [
      '--ghost-control-touch-min',
      '--ghost-border-primary',
      '--ghost-border-danger',
      '--ghost-focus-ring-width',
      '--ghost-focus-ring-color',
      '--ghost-focus-ring-offset',
      '--ghost-action-disabled-opacity',
      '--ghost-motion-duration-fast',
    ]) {
      expect(css).toContain(token)
    }
    expect(findHardcodedVisuals(css)).toEqual([])
  })

  it('scopes every rule to the themed wrappers and never to internal parts', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const all = selectors(css)
    expect(all.length).toBeGreaterThan(0)
    for (const selector of all) {
      expect(selector).toMatch(/^\.ghost-file-upload[a-z-]*\[data-themed\]/)
      // No descendant combinator: only a part itself or its direct children.
      expect(selector.replace(/\s*>\s*/g, '>')).not.toMatch(/\s/)
    }
    expect(css).not.toMatch(/\.ghost-theme\b|\.ghost-themed-scope\b/)
    expect(css).not.toMatch(/picker|form-input|announcer/)
    expect(css).toContain(
      ".ghost-file-upload-list[data-themed] > [data-part='item']",
    )
  })

  it('covers dragging, invalid, disabled, and focus-visible states', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toContain(
      ".ghost-file-upload-dropzone[data-themed][data-state='dragging']",
    )
    expect(css).toContain(
      ".ghost-file-upload-dropzone[data-themed][data-state='invalid']",
    )
    expect(css).toContain(
      ".ghost-file-upload-dropzone[data-themed][data-state='disabled']",
    )
    expect(css).toContain(
      ".ghost-file-upload-trigger[data-themed][data-state='invalid']",
    )
    expect(css).toContain(
      '.ghost-file-upload-trigger[data-themed]:focus-visible',
    )
    expect(css).toContain(
      '.ghost-file-upload-item-remove[data-themed]:focus-visible',
    )
    expect(css).toContain(
      'outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color)',
    )
  })

  it('gives both buttons a 44px minimum target', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    for (const part of ['trigger', 'item-remove']) {
      const start = css.indexOf(
        `:where(.ghost-file-upload-${part}[data-themed]) {`,
      )
      expect(start).toBeGreaterThan(-1)
      const body = css.slice(start, css.indexOf('}', start))
      expect(body).toContain('min-block-size: var(--ghost-control-touch-min)')
      expect(body).toContain('min-inline-size: var(--ghost-control-touch-min)')
    }
  })

  it('transitions only when motion is allowed and supports forced colors', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    const motion = mediaBlock(css, '(prefers-reduced-motion: no-preference)')
    expect(motion).toContain('transition-property')
    expect(css.replace(motion, '')).not.toMatch(/transition/)

    const forced = mediaBlock(css, '(forced-colors: active)')
    expect(forced).toContain('Highlight')
    expect(forced).toContain('GrayText')
    expect(forced).toContain('ButtonText')
    expect(forced).toContain('CanvasText')
  })
})
