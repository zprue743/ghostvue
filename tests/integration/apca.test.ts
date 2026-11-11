/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  apcaContrast,
  srgbToY,
} from '../../packages/themes/scripts/lib/apca.js'

describe('APCA 0.0.98G-4g', () => {
  it('returns ~Lc 106 for black text on white (published 0.0.98G BoW)', () => {
    expect(Math.round(apcaContrast('#000000', '#ffffff'))).toBe(106)
  })

  it('returns a negative Lc for white text on black (WoB polarity)', () => {
    const lc = apcaContrast('#ffffff', '#000000')
    expect(lc).toBeLessThan(0)
    expect(Math.round(lc)).toBe(-108)
  })

  it('returns 0 for identical colors and for near-zero delta Y', () => {
    expect(apcaContrast('#334155', '#334155')).toBe(0)
    expect(apcaContrast('#000000', '#000000')).toBe(0)
  })

  it('parses 3-digit hex and is case-insensitive', () => {
    expect(apcaContrast('#000', '#FFF')).toBeCloseTo(
      apcaContrast('#000000', '#ffffff'),
      5,
    )
  })

  it('uses the 2.4 simple exponential for Y, not the WCAG piecewise sRGB decode', () => {
    // APCA 0.0.98G: Y = (channel/255)^2.4, not the 0.04045 piecewise curve.
    expect(srgbToY('#808080')).toBeCloseTo((128 / 255) ** 2.4, 5)
  })
})
