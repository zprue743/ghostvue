import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSlider', () => {
  test('adjusts from keyboard, participates in forms, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostSlider',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const ceiling = page.getByRole('slider', { name: 'Price ceiling' })
      await expect(ceiling).toHaveAttribute('aria-valuenow', '40')
      await ceiling.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByText('Price ceiling: 50')).toBeVisible()
      await page.keyboard.press('Home')
      await expect(ceiling).toHaveAttribute('aria-valuenow', '0')

      const low = page.getByRole('slider', { name: 'Price band' }).first()
      await low.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByText('Interval: 30–80')).toBeVisible()

      await page.getByRole('button', { name: 'Apply filter' }).click()
      await expect(page.getByText('Filter applied: 30–80')).toBeVisible()

      const singleTrack = page
        .getByTestId('slider-single')
        .locator('[data-part="track"]')
      const trackBox = await singleTrack.boundingBox()
      expect(trackBox).not.toBeNull()
      if (!trackBox) return
      const trackY = trackBox.y + trackBox.height / 2
      await page.mouse.move(trackBox.x + trackBox.width * 0.15, trackY)
      await page.mouse.down()
      await page.mouse.move(trackBox.x + trackBox.width * 0.75, trackY)
      await page.mouse.up()
      await expect(page.getByText('Price ceiling: 150')).toBeVisible()

      const themed = page.getByRole('slider', { name: 'Master volume' })
      await themed.focus()
      await page.keyboard.press('PageUp')
      await expect(themed).toHaveAttribute('aria-valuenow', '65')

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="slider-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('centers thumbs and vertical rails across LTR/RTL, sizes, pointer drags, keyboard, and reactive dir', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await expect(page.getByTestId('slider-geometry-lab')).toBeVisible()

      const measure = async (testId: string) =>
        page.getByTestId(testId).evaluate((root) => {
          const rectOf = (el: Element | null) => {
            if (!el) throw new Error('missing slider part')
            const r = el.getBoundingClientRect()
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
              centerX: r.left + r.width / 2,
              centerY: r.top + r.height / 2,
            }
          }
          const thumbs = Array.from(
            root.querySelectorAll('[data-part="thumb"]'),
          ).map((el) => rectOf(el))
          return {
            root: rectOf(root),
            rail: rectOf(root.querySelector('[data-part="rail"]')),
            track: rectOf(root.querySelector('[data-part="track"]')),
            thumbs,
          }
        })

      // 1. Inherited dir="rtl": horizontal single at min (sm=12), mid (md=16), max (lg=20)
      const hSmRtl = await measure('slider-lab-h-single-sm')
      expect(hSmRtl.thumbs[0]?.width).toBeCloseTo(12, 0.5)
      expect(hSmRtl.thumbs[0]?.centerX).toBeCloseTo(hSmRtl.track.right, 1)

      const hMdRtl = await measure('slider-lab-h-single-md')
      expect(hMdRtl.thumbs[0]?.width).toBeCloseTo(16, 0.5)
      expect(hMdRtl.thumbs[0]?.centerX).toBeCloseTo(hMdRtl.track.centerX, 1)

      const hLgRtl = await measure('slider-lab-h-single-lg')
      expect(hLgRtl.thumbs[0]?.width).toBeCloseTo(20, 0.5)
      expect(hLgRtl.thumbs[0]?.centerX).toBeCloseTo(hLgRtl.track.left, 1)

      // 2. Inherited dir="rtl": horizontal range at [0, 100]
      const hRangeRtl = await measure('slider-lab-h-range-md')
      expect(hRangeRtl.thumbs[0]?.centerX).toBeCloseTo(hRangeRtl.track.right, 1)
      expect(hRangeRtl.thumbs[1]?.centerX).toBeCloseTo(hRangeRtl.track.left, 1)

      // 3. Inherited dir="rtl": vertical single (sm) and range (lg) rail & thumb inline centering
      const vSmRtl = await measure('slider-lab-v-single-sm')
      expect(vSmRtl.rail.centerX).toBeCloseTo(vSmRtl.root.centerX, 1)
      expect(vSmRtl.thumbs[0]?.centerX).toBeCloseTo(vSmRtl.track.centerX, 1)
      expect(vSmRtl.thumbs[0]?.centerY).toBeCloseTo(vSmRtl.track.centerY, 1)

      const vRangeRtl = await measure('slider-lab-v-range-lg')
      expect(vRangeRtl.rail.centerX).toBeCloseTo(vRangeRtl.root.centerX, 1)
      expect(vRangeRtl.thumbs[0]?.centerX).toBeCloseTo(
        vRangeRtl.track.centerX,
        1,
      )
      expect(vRangeRtl.thumbs[1]?.centerX).toBeCloseTo(
        vRangeRtl.track.centerX,
        1,
      )
      expect(vRangeRtl.thumbs[0]?.centerY).toBeCloseTo(
        vRangeRtl.track.bottom - vRangeRtl.track.height * 0.2,
        1,
      )
      expect(vRangeRtl.thumbs[1]?.centerY).toBeCloseTo(
        vRangeRtl.track.bottom - vRangeRtl.track.height * 0.8,
        1,
      )

      // 4. Keyboard RTL on horizontal single sm (starts at 0)
      const hSmThumb = page
        .getByTestId('slider-lab-h-single-sm')
        .getByRole('slider')
      await hSmThumb.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(hSmThumb).toHaveAttribute('aria-valuenow', '1')
      await page.keyboard.press('End')
      await expect(hSmThumb).toHaveAttribute('aria-valuenow', '100')
      const hSmRtlMax = await measure('slider-lab-h-single-sm')
      expect(hSmRtlMax.thumbs[0]?.centerX).toBeCloseTo(hSmRtlMax.track.left, 1)
      await page.keyboard.press('Home')
      await expect(hSmThumb).toHaveAttribute('aria-valuenow', '0')

      // 5. Pointer drag in RTL: horizontal single md to 25% (from right) and 100% (left endpoint)
      await page.getByTestId('slider-lab-h-single-md').scrollIntoViewIfNeeded()
      const hMdBeforeDrag = await measure('slider-lab-h-single-md')
      const hMdPointerTarget =
        hMdBeforeDrag.track.right - hMdBeforeDrag.track.width * 0.25
      await page.mouse.move(
        hMdBeforeDrag.track.centerX,
        hMdBeforeDrag.track.centerY,
      )
      await page.mouse.down()
      await page.mouse.move(hMdPointerTarget, hMdBeforeDrag.track.centerY)
      await page.mouse.up()
      const hMdThumb = page
        .getByTestId('slider-lab-h-single-md')
        .getByRole('slider')
      await expect(hMdThumb).toHaveAttribute('aria-valuenow', '25')
      const hMdAfterDrag = await measure('slider-lab-h-single-md')
      expect(hMdAfterDrag.thumbs[0]?.centerX).toBeCloseTo(hMdPointerTarget, 1.5)

      // Pointer drag horizontal range in RTL: move low thumb to 30%, high thumb to 70%
      await page.getByTestId('slider-lab-h-range-md').scrollIntoViewIfNeeded()
      const hRangeBeforeDrag = await measure('slider-lab-h-range-md')
      const hRangeLowX =
        hRangeBeforeDrag.track.right - hRangeBeforeDrag.track.width * 0.3
      const hRangeHighX =
        hRangeBeforeDrag.track.right - hRangeBeforeDrag.track.width * 0.7
      await page.mouse.move(
        hRangeBeforeDrag.track.right - 2,
        hRangeBeforeDrag.track.centerY,
      )
      await page.mouse.down()
      await page.mouse.move(hRangeLowX, hRangeBeforeDrag.track.centerY)
      await page.mouse.up()
      await page.mouse.move(
        hRangeBeforeDrag.track.left + 2,
        hRangeBeforeDrag.track.centerY,
      )
      await page.mouse.down()
      await page.mouse.move(hRangeHighX, hRangeBeforeDrag.track.centerY)
      await page.mouse.up()
      const hRangeThumbs = page
        .getByTestId('slider-lab-h-range-md')
        .getByRole('slider')
      await expect(hRangeThumbs.nth(0)).toHaveAttribute('aria-valuenow', '30')
      await expect(hRangeThumbs.nth(1)).toHaveAttribute('aria-valuenow', '70')
      const hRangeAfterDrag = await measure('slider-lab-h-range-md')
      expect(hRangeAfterDrag.thumbs[0]?.centerX).toBeCloseTo(hRangeLowX, 1.5)
      expect(hRangeAfterDrag.thumbs[1]?.centerX).toBeCloseTo(hRangeHighX, 1.5)

      // Pointer drag vertical single in RTL: drag to min (bottom) and max (top)
      await page.getByTestId('slider-lab-v-single-sm').scrollIntoViewIfNeeded()
      const vSmBeforeDrag = await measure('slider-lab-v-single-sm')
      await page.mouse.move(
        vSmBeforeDrag.track.centerX,
        vSmBeforeDrag.track.centerY,
      )
      await page.mouse.down()
      await page.mouse.move(
        vSmBeforeDrag.track.centerX,
        vSmBeforeDrag.track.bottom,
      )
      await page.mouse.up()
      const vSmThumb = page
        .getByTestId('slider-lab-v-single-sm')
        .getByRole('slider')
      await expect(vSmThumb).toHaveAttribute('aria-valuenow', '0')
      const vSmMin = await measure('slider-lab-v-single-sm')
      expect(vSmMin.thumbs[0]?.centerX).toBeCloseTo(vSmMin.track.centerX, 1)
      expect(vSmMin.thumbs[0]?.centerY).toBeCloseTo(vSmMin.track.bottom, 1)

      await page.mouse.move(vSmMin.track.centerX, vSmMin.track.bottom - 2)
      await page.mouse.down()
      await page.mouse.move(vSmMin.track.centerX, vSmMin.track.top)
      await page.mouse.up()
      await expect(vSmThumb).toHaveAttribute('aria-valuenow', '100')
      const vSmMax = await measure('slider-lab-v-single-sm')
      expect(vSmMax.thumbs[0]?.centerX).toBeCloseTo(vSmMax.track.centerX, 1)
      expect(vSmMax.thumbs[0]?.centerY).toBeCloseTo(vSmMax.track.top, 1)

      // 6. Toggle inherited dir from rtl -> ltr: verify endpoints & vertical rail flip cleanly
      await page.getByTestId('slider-toggle-inherited-dir').click()

      const hSmLtr = await measure('slider-lab-h-single-sm')
      expect(hSmLtr.thumbs[0]?.centerX).toBeCloseTo(hSmLtr.track.left, 1)

      const hLgLtr = await measure('slider-lab-h-single-lg')
      expect(hLgLtr.thumbs[0]?.centerX).toBeCloseTo(hLgLtr.track.right, 1)

      const vSmLtr = await measure('slider-lab-v-single-sm')
      expect(vSmLtr.rail.centerX).toBeCloseTo(vSmLtr.root.centerX, 1)
      expect(vSmLtr.thumbs[0]?.centerX).toBeCloseTo(vSmLtr.track.centerX, 1)

      // Pointer drag in LTR after inherited dir switch
      await page.getByTestId('slider-lab-h-single-md').scrollIntoViewIfNeeded()
      const hMdLtrBeforeDrag = await measure('slider-lab-h-single-md')
      const hMdLtrTarget =
        hMdLtrBeforeDrag.track.left + hMdLtrBeforeDrag.track.width * 0.75
      await page.mouse.move(
        hMdLtrBeforeDrag.track.left + hMdLtrBeforeDrag.track.width * 0.25,
        hMdLtrBeforeDrag.track.centerY,
      )
      await page.mouse.down()
      await page.mouse.move(hMdLtrTarget, hMdLtrBeforeDrag.track.centerY)
      await page.mouse.up()
      await expect(hMdThumb).toHaveAttribute('aria-valuenow', '75')
      const hMdLtrAfterDrag = await measure('slider-lab-h-single-md')
      expect(hMdLtrAfterDrag.thumbs[0]?.centerX).toBeCloseTo(hMdLtrTarget, 1.5)

      // 7. Reactive dir prop directly on slider (ltr -> rtl at value 25)
      const reactiveLtr = await measure('slider-lab-reactive-dir')
      expect(reactiveLtr.thumbs[0]?.centerX).toBeCloseTo(
        reactiveLtr.track.left + reactiveLtr.track.width * 0.25,
        1,
      )

      await page.getByTestId('slider-toggle-reactive-dir').click()
      const reactiveRtl = await measure('slider-lab-reactive-dir')
      expect(reactiveRtl.thumbs[0]?.centerX).toBeCloseTo(
        reactiveRtl.track.right - reactiveRtl.track.width * 0.25,
        1,
      )
    } finally {
      await playground.close()
    }
  })
})
