import type { Page } from '@playwright/test'

/** Anything with a layout box: a Locator or an ElementHandle. */
export interface Boxed {
  scrollIntoViewIfNeeded: () => Promise<void>
  boundingBox: () => Promise<{
    x: number
    y: number
    width: number
    height: number
  } | null>
}

/**
 * Pixel evidence for a focus indicator, measured as the change between an
 * element's focused and unfocused renderings (the WCAG 2.4.13 "change of
 * contrast" model). Computed styles cannot answer this on their own: rings
 * live on the element, a `::before`, or a child part (Switch track), and
 * overflow or stacking can hide them. Comparing what the browser painted
 * covers all of those, including body-portaled overlays and forced colors.
 */
export interface FocusChange {
  /** Pixels whose colour changed with a contrast ratio of at least 3:1. */
  area: number
  /** Area of a 1 CSS px perimeter around the element's border box. */
  perimeter: number
  /** Share of each edge (0-1) that carries a qualifying change near it. */
  sides: { top: number; right: number; bottom: number; left: number }
  /** True when the border box moved or resized between the two states. */
  shifted: boolean
}

export interface FocusChangeOptions {
  /**
   * How far outside the border box to look, in CSS px. Outer rings need room
   * (ring width plus offset); inset rings inside list items do not.
   */
  inflate: number
  /**
   * Ways to take the indicator off the target and put it back. Each yields
   * one unfocused baseline; a pixel counts only when it differs from every
   * baseline that covers it. Moving the highlight to the item below paints
   * that item's ring along the target's bottom edge, so such a baseline
   * covers only the top half (`covers: 'top'`), and the one from the item
   * above only the bottom half.
   */
  baselines: readonly {
    away: () => Promise<void>
    back: () => Promise<void>
    covers?: 'top' | 'bottom'
  }[]
}

/** How far inside the border box an inset ring may sit and still count. */
const INSET_BAND = 7

/**
 * Capture `target` while it shows focus, then the same region once per
 * baseline, and measure the change. Focus is back on the target afterwards.
 */
export async function measureFocusChange(
  page: Page,
  target: Boxed,
  { inflate, baselines }: FocusChangeOptions,
): Promise<FocusChange> {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('focus measurement needs a fixed viewport')
  // A target cut by the viewport edge would read as a clipped ring, so
  // centre it vertically first (scrollIntoViewIfNeeded stops at the edge).
  await target.scrollIntoViewIfNeeded()
  const initial = await target.boundingBox()
  if (!initial) throw new Error('focus target has no layout box')
  if (
    initial.y - inflate < 0 ||
    initial.y + initial.height + inflate > viewport.height
  ) {
    const offset = initial.y + initial.height / 2 - viewport.height / 2
    await page.evaluate((delta) => {
      window.scrollBy(0, delta)
    }, offset)
  }
  // Hover would add its own change; keep the pointer away from the target.
  await page.mouse.move(0, 0)
  const box = await target.boundingBox()
  if (!box) throw new Error('focus target has no layout box')
  if (
    box.y - inflate < 0 ||
    box.x - inflate < 0 ||
    box.y + box.height + inflate > viewport.height ||
    box.x + box.width + inflate > viewport.width
  ) {
    throw new Error('focus target and its ring do not fit in the viewport')
  }
  const x = Math.max(0, Math.floor(box.x - inflate))
  const y = Math.max(0, Math.floor(box.y - inflate))
  const clip = {
    x,
    y,
    width: Math.min(viewport.width, Math.ceil(box.x + box.width + inflate)) - x,
    height:
      Math.min(viewport.height, Math.ceil(box.y + box.height + inflate)) - y,
  }
  const shot = async (): Promise<string> =>
    (
      await page.screenshot({ clip, animations: 'disabled', caret: 'hide' })
    ).toString('base64')

  const focused = await shot()
  const unfocused: { image: string; covers: 'top' | 'bottom' | 'all' }[] = []
  let shifted = false
  for (const baseline of baselines) {
    await baseline.away()
    await page.mouse.move(0, 0)
    unfocused.push({ image: await shot(), covers: baseline.covers ?? 'all' })
    const after = await target.boundingBox()
    shifted ||=
      !after ||
      Math.abs(after.x - box.x) > 0.5 ||
      Math.abs(after.y - box.y) > 0.5 ||
      Math.abs(after.width - box.width) > 0.5 ||
      Math.abs(after.height - box.height) > 0.5
    await baseline.back()
  }

  // The element box relative to the clip, for the per-edge coverage bands.
  const edges = {
    left: box.x - x,
    top: box.y - y,
    right: box.x + box.width - x,
    bottom: box.y + box.height - y,
  }
  const measured = await page.evaluate(
    async ({ focused, unfocused, edges, inflate, band }) => {
      async function pixels(base64: string): Promise<ImageData> {
        const blob = await (
          await fetch(`data:image/png;base64,${base64}`)
        ).blob()
        const bitmap = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('2D canvas context is required')
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height)
      }
      function luminance(data: Uint8ClampedArray, index: number): number {
        const channel = (value: number): number => {
          const srgb = value / 255
          return srgb <= 0.03928
            ? srgb / 12.92
            : ((srgb + 0.055) / 1.055) ** 2.4
        }
        return (
          0.2126 * channel(data[index] ?? 0) +
          0.7152 * channel(data[index + 1] ?? 0) +
          0.0722 * channel(data[index + 2] ?? 0)
        )
      }
      const on = await pixels(focused)
      const offs = await Promise.all(
        unfocused.map(async ({ image, covers }) => ({
          data: (await pixels(image)).data,
          covers,
        })),
      )
      const { width, height } = on
      const changed = new Uint8Array(width * height)
      let area = 0
      for (let index = 0; index < width * height; index += 1) {
        const half = Math.floor(index / width) < height / 2 ? 'top' : 'bottom'
        const first = luminance(on.data, index * 4)
        const ratios = offs
          .filter(({ covers }) => covers === 'all' || covers === half)
          .map(({ data }) => {
            const second = luminance(data, index * 4)
            return (
              (Math.max(first, second) + 0.05) /
              (Math.min(first, second) + 0.05)
            )
          })
        if (ratios.length > 0 && Math.min(...ratios) >= 3) {
          changed[index] = 1
          area += 1
        }
      }
      const hit = (px: number, py: number): boolean =>
        px >= 0 && py >= 0 && px < width && py < height
          ? changed[py * width + px] === 1
          : false
      // Fraction of positions along one edge with a change within its band.
      function coverage(
        from: number,
        to: number,
        bandFrom: number,
        bandTo: number,
        horizontal: boolean,
      ): number {
        let covered = 0
        let total = 0
        for (let along = Math.ceil(from); along < Math.floor(to); along += 1) {
          total += 1
          for (
            let across = Math.floor(bandFrom);
            across < bandTo;
            across += 1
          ) {
            if (horizontal ? hit(along, across) : hit(across, along)) {
              covered += 1
              break
            }
          }
        }
        return total === 0 ? 0 : covered / total
      }
      const w = edges.right - edges.left
      const h = edges.bottom - edges.top
      return {
        area,
        perimeter: Math.round(2 * (w + h)),
        sides: {
          top: coverage(
            edges.left,
            edges.right,
            edges.top - inflate,
            edges.top + band,
            true,
          ),
          bottom: coverage(
            edges.left,
            edges.right,
            edges.bottom - band,
            edges.bottom + inflate,
            true,
          ),
          left: coverage(
            edges.top,
            edges.bottom,
            edges.left - inflate,
            edges.left + band,
            false,
          ),
          right: coverage(
            edges.top,
            edges.bottom,
            edges.right - band,
            edges.right + inflate,
            false,
          ),
        },
      }
    },
    { focused, unfocused, edges, inflate, band: INSET_BAND },
  )
  return { ...measured, shifted }
}
