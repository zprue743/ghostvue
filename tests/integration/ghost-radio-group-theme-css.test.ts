/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(
  process.cwd(),
  'packages/themes/src/ghost-radio-group.css',
)

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Declarations of the first rule whose selector ends with `pseudo`. */
function pseudoRule(css: string, pseudo: '::before' | '::after'): string {
  const source = stripComments(css)
  const pattern = new RegExp(
    `\\.ghost-radio-group-item(?:\\[[^\\]]*\\])?\\s*\\)${pseudo}\\s*\\{([^}]*)\\}`,
  )
  const match = pattern.exec(source)
  if (!match?.[1]) throw new Error(`No ${pseudo} rule for the radio item`)
  return match[1]
}

describe('GhostRadioGroup theme CSS', () => {
  it('stacks the ring and the checked dot in the same grid cell', async () => {
    // The item is an inline grid. If only the dot names an area, auto-placement
    // pushes the ring into a second row and the dot renders above the ring.
    const css = await readFile(cssPath, 'utf8')
    expect(pseudoRule(css, '::before')).toMatch(/grid-area:\s*1\s*\/\s*1;/)
    expect(pseudoRule(css, '::after')).toMatch(/grid-area:\s*1\s*\/\s*1;/)
  })

  it('supports sm/lg sizes via --_ghost-radio-hit and forced-colors mode', async () => {
    const css = stripComments(await readFile(cssPath, 'utf8'))
    expect(css).toContain(".ghost-radio-group[data-size='sm']")
    expect(css).toContain(
      '--_ghost-radio-hit: var(--ghost-control-size-sm-min);',
    )
    expect(css).toContain(".ghost-radio-group[data-size='lg']")
    expect(css).toContain(
      '--_ghost-radio-hit: var(--ghost-control-size-lg-min);',
    )
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('ButtonFace')
    expect(css).toContain('ButtonText')
    expect(css).toContain('GrayText')
    expect(css).toContain('outline-color: Highlight;')
  })
})
