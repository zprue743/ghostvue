/** @vitest-environment node */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssPath = resolve(process.cwd(), 'packages/themes/src/ghost-slider.css')

describe('GhostSlider theme CSS tokens', () => {
  it('styles track, range, and thumb parts inside the theme layer', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain("[data-part='track']")
    expect(css).toContain("[data-part='range']")
    expect(css).toContain("[data-part='thumb']")
    expect(css).toContain('@layer ghostvue-theme')
  })

  it('sizes track, range, thumb, and hit areas from density-independent track tokens', async () => {
    const css = (await readFile(cssPath, 'utf8')).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    for (const size of ['sm', 'md', 'lg']) {
      expect(css).toContain(`--ghost-track-thickness-${size}`)
      expect(css).toContain(`--ghost-track-thumb-${size}`)
    }
    expect(css).toContain('--ghost-track-target')
    // Layout gaps collapse to 0 at compact density; they must not size paint.
    expect(css).not.toContain('--ghost-space-')
    // Only zero literals (hit-area clamps); every visible size is a token.
    expect(
      [...css.matchAll(/-?[\d.]+(?:px|rem|em)\b/g)]
        .map(([value]) => value)
        .filter((value) => !/^0+(?:\.0+)?(?:px|rem|em)$/.test(value)),
    ).toEqual([])
  })
})
