import { describe, expect, it } from 'vitest'

import {
  isScrollSpyScrollable,
  resolveScrollSpyActiveIndex,
  resolveScrollSpyProgress,
  resolveScrollSpyProbeY,
  resolveScrollSpySegmentProgress,
  resolveScrollSpyTravelDirection,
} from './scroll-spy-motion'

describe('resolveScrollSpyProbeY', () => {
  it('treats values in (0, 1] as a viewport fraction', () => {
    expect(resolveScrollSpyProbeY(100, 0.4)).toBe(40)
  })

  it('treats zero and values above one as pixel offsets', () => {
    expect(resolveScrollSpyProbeY(100, 0)).toBe(0)
    expect(resolveScrollSpyProbeY(100, 48)).toBe(48)
  })
})

describe('resolveScrollSpyProgress', () => {
  it('clamps at 0 and 1', () => {
    expect(resolveScrollSpyProgress(-10, 1000, 200)).toBe(0)
    expect(resolveScrollSpyProgress(1000, 1000, 200)).toBe(1)
  })

  it('returns 0 when the container is not scrollable', () => {
    expect(resolveScrollSpyProgress(0, 200, 400)).toBe(0)
  })
})

describe('resolveScrollSpyActiveIndex', () => {
  it('selects the last crossing section for both scroll directions', () => {
    const probe = 160
    const atTop = [probe + 40, probe + 80, probe + 120]
    expect(resolveScrollSpyActiveIndex(atTop, 400, 0.05, 0.4)).toBe(0)

    const midPage = [40, 10, -40]
    expect(resolveScrollSpyActiveIndex(midPage, 400, 0.5, 0.4)).toBe(2)

    const atEnd = [40, 10, -40]
    expect(resolveScrollSpyActiveIndex(atEnd, 400, 0.995, 0.4)).toBe(2)
  })

  it('forces the final section active at endThreshold', () => {
    const tops = [300, 200, 100]
    expect(resolveScrollSpyActiveIndex(tops, 400, 0.995)).toBe(2)
  })

  it('returns 0 for empty targets', () => {
    expect(resolveScrollSpyActiveIndex([], 400, 0.5)).toBe(0)
  })
})

describe('resolveScrollSpySegmentProgress', () => {
  it('clamps segment progress between 0 and 1', () => {
    const tops = [240, 120, 20]
    const viewport = 400
    const value = resolveScrollSpySegmentProgress(
      tops,
      viewport,
      50,
      resolveScrollSpyProgress(50, 2000, viewport),
    )
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(1)
  })

  it('reaches 1 on the last section', () => {
    const tops = [400, 0]
    const viewport = 400
    expect(resolveScrollSpySegmentProgress(tops, viewport, 800, 1, 0.4)).toBe(1)
  })
})

describe('resolveScrollSpyTravelDirection', () => {
  it('ignores sub-pixel jitter', () => {
    expect(resolveScrollSpyTravelDirection(10, 10.25)).toBeUndefined()
  })

  it('reports down and up travel', () => {
    expect(resolveScrollSpyTravelDirection(0, 24)).toBe('down')
    expect(resolveScrollSpyTravelDirection(24, 0)).toBe('up')
  })
})

describe('isScrollSpyScrollable', () => {
  it('detects scrollable overflow', () => {
    expect(isScrollSpyScrollable(1000, 200)).toBe(true)
    expect(isScrollSpyScrollable(200, 400)).toBe(false)
  })
})
