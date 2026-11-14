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
})
