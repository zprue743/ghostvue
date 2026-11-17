import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

// GHO-182: themed Progress and Slider paint must stay visible and aligned at
// every size, density (including unset, which Calm maps to compact), theme, and
// mode. Layout gap tokens collapse to 0 at compact density, so the recipes read
// density-independent --ghost-track-* tokens instead.
const themes = ['default', 'calm', 'vibrant', 'mono'] as const
const densities = ['unset', 'compact', 'comfortable', 'spacious'] as const
const modes = ['light', 'dark'] as const
const sizes = ['sm', 'md', 'lg'] as const

const thickness = { sm: 4, md: 6, lg: 8 } as const
const thumb = { sm: 12, md: 16, lg: 20 } as const
const hitTarget = 24

interface Cell {
  theme: (typeof themes)[number]
  density: (typeof densities)[number]
  mode: (typeof modes)[number]
  size: (typeof sizes)[number]
}

interface Box {
  width: number
  height: number
  centerX: number
  centerY: number
}

interface Measured {
  progress: Box
  indicator: Box
  horizontal: {
    track: Box
    range: Box
    thumb: Box
    trackHit: boolean
    thumbHit: boolean
  }
  vertical: { track: Box; range: Box; thumb: Box; trackHit: boolean }
}

const cells: Cell[] = themes.flatMap((theme) =>
  densities.flatMap((density) =>
    modes.flatMap((mode) =>
      sizes.map((size) => ({ theme, density, mode, size })),
    ),
  ),
)

test.describe('themed track geometry', () => {
  test('Progress and Slider paint nonzero, aligned, token-sized tracks with separate hit targets', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await expect(page.getByTestId('progress-themed')).toBeVisible()
      await expect(page.getByTestId('slider-themed')).toBeVisible()

      const results = await page.evaluate(
        ({ cells: matrix, hitTarget: target }) => {
          const progressSource = document
            .querySelector('[data-testid="progress-themed"]')
            ?.closest('.ghost-themed-scope')
          const sliderSource = document
            .querySelector('[data-testid="slider-themed"]')
            ?.closest('.ghost-themed-scope')
          const verticalSource = document
            .querySelector('[data-testid="slider-themed-vertical"]')
            ?.closest('.ghost-themed-scope')
          if (!progressSource || !sliderSource || !verticalSource) {
            throw new Error('themed sources missing')
          }

          const box = (element: Element | null) => {
            if (!element) throw new Error('part missing')
            const rect = element.getBoundingClientRect()
            return {
              width: rect.width,
              height: rect.height,
              centerX: rect.left + rect.width / 2,
              centerY: rect.top + rect.height / 2,
            }
          }
          const hits = (x: number, y: number, part: string) =>
            document.elementFromPoint(x, y)?.closest(`[data-part="${part}"]`) !=
            null

          return matrix.map((cell) => {
            // Mounted directly on <body> so no ancestor density applies; the
            // Calm unset-density selector excludes any [data-ghost-density] ancestor.
            const host = document.createElement('div')
            host.className = 'ghost-theme'
            if (cell.theme !== 'default')
              host.dataset['ghostTheme'] = cell.theme
            if (cell.density !== 'unset')
              host.dataset['ghostDensity'] = cell.density
            host.dataset['ghostMode'] = cell.mode
            host.style.cssText =
              'position:fixed;inset-block-start:0;inset-inline-start:0;inline-size:20rem;padding:2rem;display:flex;gap:2rem;align-items:center;'
            const progress = progressSource.cloneNode(true) as HTMLElement
            const slider = sliderSource.cloneNode(true) as HTMLElement
            const vertical = verticalSource.cloneNode(true) as HTMLElement
            progress.style.cssText = 'display:block;inline-size:6rem;'
            for (const scope of [progress, slider, vertical]) {
              scope
                .querySelector('.ghost-progress, .ghost-slider')
                ?.setAttribute('data-size', cell.size)
            }
            host.append(progress, slider, vertical)
            document.body.append(host)

            const progressBar = progress.querySelector('.ghost-progress')
            const parts = (root: Element) => ({
              track: box(root.querySelector('[data-part="track"]')),
              range: box(root.querySelector('[data-part="range"]')),
              thumb: box(root.querySelector('[data-part="thumb"]')),
            })
            const horizontal = parts(slider)
            const verticalParts = parts(vertical)
            // Probe just inside the 24px hit target but outside the painted track.
            const offset = target / 2 - 1
            // Probe the track end farther from the thumb so the thumb's own
            // hit area cannot answer for the track.
            const trackStart =
              horizontal.track.centerX - horizontal.track.width / 2
            const trackEnd =
              horizontal.track.centerX + horizontal.track.width / 2
            const trackProbeX =
              horizontal.thumb.centerX - trackStart >
              trackEnd - horizontal.thumb.centerX
                ? trackStart + 4
                : trackEnd - 4
            const verticalTop =
              verticalParts.track.centerY - verticalParts.track.height / 2
            const verticalBottom =
              verticalParts.track.centerY + verticalParts.track.height / 2
            const verticalProbeY =
              verticalParts.thumb.centerY - verticalTop >
              verticalBottom - verticalParts.thumb.centerY
                ? verticalTop + 4
                : verticalBottom - 4
            const measured = {
              progress: box(progressBar),
              indicator: box(
                progressBar?.querySelector('[data-part="indicator"]') ?? null,
              ),
              horizontal: {
                ...horizontal,
                trackHit: hits(
                  trackProbeX,
                  horizontal.track.centerY + offset,
                  'track',
                ),
                thumbHit: hits(
                  horizontal.thumb.centerX,
                  horizontal.thumb.centerY - offset,
                  'thumb',
                ),
              },
              vertical: {
                ...verticalParts,
                trackHit: hits(
                  verticalParts.track.centerX + offset,
                  verticalProbeY,
                  'track',
                ),
              },
            }
            host.remove()
            return { cell, measured }
          })
        },
        { cells, hitTarget },
      )

      for (const { cell, measured } of results as {
        cell: Cell
        measured: Measured
      }[]) {
        const label = `${cell.theme}/${cell.density}/${cell.mode}/${cell.size}`
        const expectedThickness = thickness[cell.size]
        const expectedThumb = thumb[cell.size]

        expect(measured.progress.height, `${label} progress`).toBeCloseTo(
          expectedThickness,
          1,
        )
        expect(measured.indicator.height, `${label} indicator`).toBeCloseTo(
          expectedThickness,
          1,
        )

        const { horizontal, vertical } = measured
        expect(horizontal.track.height, `${label} track`).toBeCloseTo(
          expectedThickness,
          1,
        )
        expect(horizontal.range.height, `${label} range`).toBeCloseTo(
          expectedThickness,
          1,
        )
        expect(horizontal.thumb.height, `${label} thumb`).toBeCloseTo(
          expectedThumb,
          1,
        )
        expect(horizontal.thumb.width, `${label} thumb`).toBeCloseTo(
          expectedThumb,
          1,
        )
        // Track, range, and thumb share one center line.
        expect(
          Math.abs(horizontal.range.centerY - horizontal.track.centerY),
          `${label} range align`,
        ).toBeLessThanOrEqual(0.5)
        expect(
          Math.abs(horizontal.thumb.centerY - horizontal.track.centerY),
          `${label} thumb align`,
        ).toBeLessThanOrEqual(0.5)
        expect(horizontal.trackHit, `${label} track hit`).toBe(true)
        expect(horizontal.thumbHit, `${label} thumb hit`).toBe(true)

        expect(vertical.track.width, `${label} vertical track`).toBeCloseTo(
          expectedThickness,
          1,
        )
        expect(vertical.range.width, `${label} vertical range`).toBeCloseTo(
          expectedThickness,
          1,
        )
        expect(
          Math.abs(vertical.range.centerX - vertical.track.centerX),
          `${label} vertical range align`,
        ).toBeLessThanOrEqual(0.5)
        expect(
          Math.abs(vertical.thumb.centerX - vertical.track.centerX),
          `${label} vertical thumb align`,
        ).toBeLessThanOrEqual(0.5)
        expect(vertical.trackHit, `${label} vertical track hit`).toBe(true)
      }
    } finally {
      await playground.close()
    }
  })

  test('slider focus ring is unclipped and focusing does not shift layout', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const slider = page.getByTestId('slider-themed')
      const thumbPart = slider.locator('[data-part="thumb"]')
      await slider.scrollIntoViewIfNeeded()
      // Thumb geometry relative to the root, so focus scrolling cannot mask a shift.
      const geometry = () =>
        thumbPart.evaluate((element) => {
          const root = element.closest('.ghost-slider')
          if (!root) throw new Error('slider root missing')
          const rootRect = root.getBoundingClientRect()
          const rect = element.getBoundingClientRect()
          return {
            rootWidth: rootRect.width,
            rootHeight: rootRect.height,
            left: rect.left - rootRect.left,
            top: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
          }
        })
      const before = await geometry()

      await thumbPart.focus()
      await expect(thumbPart).toBeFocused()
      expect(await geometry()).toEqual(before)
      await thumbPart.hover()
      expect(await geometry()).toEqual(before)

      const ring = await thumbPart.evaluate((element) => {
        const style = getComputedStyle(element)
        let ancestor = element.parentElement
        const clippers: string[] = []
        while (ancestor && ancestor !== document.body) {
          const overflow = getComputedStyle(ancestor).overflow
          if (overflow !== 'visible') clippers.push(overflow)
          ancestor = ancestor.parentElement
        }
        return {
          outlineWidth: Number.parseFloat(style.outlineWidth),
          outlineStyle: style.outlineStyle,
          clippers,
        }
      })
      expect(ring.outlineStyle).toBe('solid')
      expect(ring.outlineWidth).toBeGreaterThan(0)
      expect(ring.clippers).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
