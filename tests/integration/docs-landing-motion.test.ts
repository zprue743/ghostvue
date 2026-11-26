import { describe, expect, it } from 'vitest'

import {
  LANDING_ACTIVE_PROBE,
  isPageScrollable,
  landingSections,
  resolveActiveSection,
  resolveRailProgress,
  resolveScrollProgress,
  resolveSectionPhase,
  resolveTravelDirection,
} from '../../apps/docs/.vitepress/theme/landing-motion'

const VIEWPORT = 1000
const PROBE = VIEWPORT * LANDING_ACTIVE_PROBE

/** Viewport-relative tops of three 1000px sections at a scroll offset. */
function topsAt(scrollTop: number): number[] {
  return [0, 1000, 2000].map((top) => top - scrollTop)
}

describe('landing section list', () => {
  it('has unique ids, because each one is a fragment target', () => {
    const ids = landingSections.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('resolveScrollProgress', () => {
  it('maps scroll position onto 0..1', () => {
    expect(resolveScrollProgress(0, 3000, 1000)).toBe(0)
    expect(resolveScrollProgress(1000, 3000, 1000)).toBe(0.5)
    expect(resolveScrollProgress(2000, 3000, 1000)).toBe(1)
  })

  it('clamps overscroll at both ends', () => {
    expect(resolveScrollProgress(-80, 3000, 1000)).toBe(0)
    expect(resolveScrollProgress(2400, 3000, 1000)).toBe(1)
  })

  it('reports no progress when the page does not scroll', () => {
    expect(resolveScrollProgress(0, 800, 1000)).toBe(0)
  })
})

describe('isPageScrollable', () => {
  it('is true only when the page is taller than the viewport', () => {
    expect(isPageScrollable(3000, 1000)).toBe(true)
    expect(isPageScrollable(1000, 1000)).toBe(false)
    expect(isPageScrollable(800, 1000)).toBe(false)
  })
})

describe('resolveActiveSection', () => {
  it('keeps the first section active at the top of the page', () => {
    expect(resolveActiveSection(topsAt(0), VIEWPORT, 0)).toBe(0)
  })

  it('switches when the next section crosses the probe line', () => {
    const justBefore = 1000 - PROBE - 1
    const justAfter = 1000 - PROBE + 1
    expect(resolveActiveSection(topsAt(justBefore), VIEWPORT, 0.3)).toBe(0)
    expect(resolveActiveSection(topsAt(justAfter), VIEWPORT, 0.3)).toBe(1)
  })

  it('returns to the earlier section when scrolling back up', () => {
    expect(resolveActiveSection(topsAt(1700), VIEWPORT, 0.85)).toBe(2)
    expect(resolveActiveSection(topsAt(900), VIEWPORT, 0.45)).toBe(1)
    expect(resolveActiveSection(topsAt(100), VIEWPORT, 0.05)).toBe(0)
  })

  it('selects the last section at the end of the page even if it is short', () => {
    // The last section's top never reaches the probe line.
    const tops = [-1500, -500, 700]
    expect(resolveActiveSection(tops, VIEWPORT, 0.5)).toBe(1)
    expect(resolveActiveSection(tops, VIEWPORT, 1)).toBe(2)
  })

  it('handles a page with no sections', () => {
    expect(resolveActiveSection([], VIEWPORT, 0)).toBe(0)
  })
})

describe('resolveRailProgress', () => {
  it('starts at the first marker and ends at the last', () => {
    expect(resolveRailProgress(topsAt(0), VIEWPORT, 0, 0)).toBe(0)
    expect(resolveRailProgress(topsAt(2000), VIEWPORT, 2000, 1)).toBe(1)
  })

  it('reaches a marker exactly when its section becomes active', () => {
    const scrollTop = 1000 - PROBE
    expect(
      resolveRailProgress(topsAt(scrollTop), VIEWPORT, scrollTop, 0.3),
    ).toBeCloseTo(0.5)
  })

  it('moves monotonically with scroll position', () => {
    const samples = [0, 150, 300, 600, 900, 1200, 1500].map((scrollTop) =>
      resolveRailProgress(
        topsAt(scrollTop),
        VIEWPORT,
        scrollTop,
        scrollTop / 2000,
      ),
    )
    const sorted = [...samples].sort((a, b) => a - b)
    expect(samples).toEqual(sorted)
    expect(new Set(samples).size).toBe(samples.length)
  })

  it('falls back to page progress with fewer than two sections', () => {
    expect(resolveRailProgress([0], VIEWPORT, 400, 0.4)).toBe(0.4)
  })
})

describe('resolveTravelDirection', () => {
  it('reports the direction the page moved in', () => {
    expect(resolveTravelDirection(100, 180)).toBe('down')
    expect(resolveTravelDirection(180, 100)).toBe('up')
  })

  it('ignores sub-pixel jitter and a page that did not move', () => {
    expect(resolveTravelDirection(100, 100)).toBeUndefined()
    expect(resolveTravelDirection(100, 100.3)).toBeUndefined()
  })
})

describe('resolveSectionPhase', () => {
  it('is active while the section intersects the observed band', () => {
    expect(resolveSectionPhase(true, 300, 180)).toBe('active')
  })

  it('is before while the section is still below the band', () => {
    expect(resolveSectionPhase(false, 900, 180)).toBe('before')
  })

  it('is after once the section has left above the band', () => {
    expect(resolveSectionPhase(false, -700, 180)).toBe('after')
  })
})
