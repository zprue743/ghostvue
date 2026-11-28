import { expect, type Locator } from '@playwright/test'

/*
 * Shared geometry checks for the themed GhostSegmentedControl. The sliding
 * indicator is positioned as an equal 1/n fraction of the track from CSS
 * variables, so it only lines up with the selected segment when the layout
 * really gives every segment 1/n of the width (issue #392).
 */

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}

export interface SegmentGeometry {
  control: Box
  indicator: Box
  segment: Box
  label: Box
  /** Outline box of the selected segment as painted when it has focus. */
  ring: Box
}

/**
 * Reads the selected segment, sliding indicator, label glyphs, and focus-ring
 * extent in one layout pass. The label rect comes from a Range over the
 * trimmed text so slot whitespace does not skew the centering check.
 */
export async function selectedSegmentGeometry(
  group: Locator,
): Promise<SegmentGeometry> {
  return group.evaluate((control): SegmentGeometry => {
    const toBox = (rect: DOMRect): Box => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
    })
    const segment = control.querySelector<HTMLElement>(
      '.ghost-segmented-control-item[data-state="on"]',
    )
    const indicator = control.querySelector('[data-part="indicator"]')
    if (!segment || !indicator) throw new Error('missing selected segment')
    const text = [...segment.childNodes].find(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        (node.textContent ?? '').trim().length > 0,
    )
    const data = text?.textContent ?? ''
    if (!text) throw new Error('missing segment label')
    const start = data.length - data.trimStart().length
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, start + data.trim().length)
    const box = segment.getBoundingClientRect()
    const style = getComputedStyle(segment, null)
    const reach =
      parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth)
    return {
      control: toBox(control.getBoundingClientRect()),
      indicator: toBox(indicator.getBoundingClientRect()),
      segment: toBox(box),
      label: toBox(range.getBoundingClientRect()),
      ring: {
        left: box.left - reach,
        right: box.right + reach,
        top: box.top - reach,
        bottom: box.bottom + reach,
        width: box.width + 2 * reach,
      },
    }
  })
}

/** Asserts the issue #392 geometry contract for the selected segment. */
export function expectAlignedSelection(
  geometry: SegmentGeometry,
  name: string,
): void {
  const { control, indicator, segment, label, ring } = geometry
  // The indicator is positioned as an equal 1/n fraction of the track, so it
  // only lines up when every segment really is 1/n wide.
  expect(Math.abs(indicator.left - segment.left), name).toBeLessThanOrEqual(1)
  expect(Math.abs(indicator.width - segment.width), name).toBeLessThanOrEqual(1)
  // The label fits its segment and is centered with even padding.
  const padStart = label.left - segment.left
  const padEnd = segment.right - label.right
  expect(padStart, name).toBeGreaterThan(4)
  expect(padEnd, name).toBeGreaterThan(4)
  expect(Math.abs(padStart - padEnd), name).toBeLessThanOrEqual(1.5)
  // Indicator and focus ring stay inside the control's border box.
  for (const box of [indicator, ring]) {
    expect(box.left, name).toBeGreaterThanOrEqual(control.left - 0.5)
    expect(box.right, name).toBeLessThanOrEqual(control.right + 0.5)
    expect(box.top, name).toBeGreaterThanOrEqual(control.top - 0.5)
    expect(box.bottom, name).toBeLessThanOrEqual(control.bottom + 0.5)
  }
}

/**
 * Asserts every segment takes an equal share of the control's padded track,
 * which is what the indicator's `1/n` width and offset assume. Unlike
 * {@link expectAlignedSelection} this also covers unselected segments, so a
 * layout that only happens to match at one index still fails.
 */
export async function expectEqualSegments(
  group: Locator,
  name: string,
): Promise<void> {
  const { track, segments } = await group.evaluate((control) => {
    const style = getComputedStyle(control)
    const rect = control.getBoundingClientRect()
    const insetStart =
      parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
    const insetEnd =
      parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight)
    return {
      track: {
        left: rect.left + insetStart,
        width: rect.width - insetStart - insetEnd,
      },
      segments: [
        ...control.querySelectorAll<HTMLElement>(
          '.ghost-segmented-control-item',
        ),
      ].map((item) => {
        const box = item.getBoundingClientRect()
        return { left: box.left, width: box.width }
      }),
    }
  })
  expect(segments.length, name).toBeGreaterThan(1)
  const share = track.width / segments.length
  segments.forEach((segment, index) => {
    expect(
      Math.abs(segment.width - share),
      `${name} #${String(index)}`,
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(segment.left - (track.left + share * index)),
      `${name} #${String(index)}`,
    ).toBeLessThanOrEqual(1)
  })
}
