import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostPopover'

test.describe('overlay primitives', { tag }, () => {
  test('flips to top and shifts inside viewport edges', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 800, height: 600 })
      await page.goto(playground.url)

      const flipAnchor = page.getByTestId('flip-anchor')
      await flipAnchor.scrollIntoViewIfNeeded()

      // Position the anchor near the bottom edge of the viewport so bottom
      // placement overflows and flip chooses top.
      await flipAnchor.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const targetTop = window.innerHeight - rect.height - 16
        window.scrollBy(0, rect.top - targetTop)
      })

      await flipAnchor.click()
      const flipFloating = page.getByTestId('flip-floating')
      await expect(flipFloating).toBeVisible()
      await expect(flipFloating).toHaveAttribute('data-placement', 'top')

      const anchorBox = await flipAnchor.boundingBox()
      const floatingBox = await flipFloating.boundingBox()
      expect(anchorBox).not.toBeNull()
      expect(floatingBox).not.toBeNull()
      if (anchorBox && floatingBox) {
        expect(floatingBox.y + floatingBox.height).toBeLessThanOrEqual(
          anchorBox.y,
        )
      }

      // Close flip floating before testing shift at the right viewport edge.
      await page.keyboard.press('Escape')
      await expect(flipFloating).toHaveCount(0)

      const shiftAnchor = page.getByTestId('shift-anchor')
      await shiftAnchor.scrollIntoViewIfNeeded()
      await shiftAnchor.click()

      const shiftFloating = page.getByTestId('shift-floating')
      await expect(shiftFloating).toBeVisible()

      await expect
        .poll(async () => {
          const box = await shiftFloating.boundingBox()
          return box ? box.x + box.width : Infinity
        })
        .toBeLessThanOrEqual(800 - 8 + 1)

      const shiftBox = await shiftFloating.boundingBox()
      const shiftAnchorBox = await shiftAnchor.boundingBox()
      expect(shiftBox).not.toBeNull()
      expect(shiftAnchorBox).not.toBeNull()
      if (shiftBox && shiftAnchorBox) {
        // Unshifted centered placement would extend past the anchor's center + half width.
        const unshiftedRight =
          shiftAnchorBox.x + shiftAnchorBox.width / 2 + shiftBox.width / 2
        expect(unshiftedRight).toBeGreaterThan(800)
        expect(shiftBox.x + shiftBox.width).toBeLessThanOrEqual(800)
      }
    } finally {
      await playground.close()
    }
  })

  test('tracks floating position when an overflow ancestor scrolls', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 800, height: 600 })
      await page.goto(playground.url)

      const scrollContainer = page.getByTestId('overlay-scroll-container')
      await scrollContainer.scrollIntoViewIfNeeded()

      const scrollAnchor = page.getByTestId('scroll-anchor')
      await scrollAnchor.click()

      const scrollFloating = page.getByTestId('scroll-floating')
      await expect(scrollFloating).toBeVisible()
      await expect(scrollFloating).toHaveAttribute('data-placement', 'bottom')

      const beforeBox = await scrollFloating.boundingBox()
      expect(beforeBox).not.toBeNull()
      const beforeY = beforeBox?.y ?? 0

      await scrollContainer.evaluate((el) => {
        el.scrollTop = 60
      })

      await expect
        .poll(async () => (await scrollFloating.boundingBox())?.y ?? 0)
        .toBeLessThan(beforeY - 40)

      const afterAnchor = await scrollAnchor.boundingBox()
      const afterFloating = await scrollFloating.boundingBox()
      expect(afterAnchor).not.toBeNull()
      expect(afterFloating).not.toBeNull()
      if (afterAnchor && afterFloating) {
        expect(
          Math.abs(afterFloating.y - (afterAnchor.y + afterAnchor.height + 4)),
        ).toBeLessThan(2)
      }
    } finally {
      await playground.close()
    }
  })

  test(
    'nested layers close only the top layer on Escape and outside-click, and trigger click toggles cleanly',
    { tag: '@component:GhostDialog' },
    async ({ page }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)

        const outerTrigger = page.getByTestId('outer-trigger')
        await outerTrigger.scrollIntoViewIfNeeded()

        // Clicking the trigger opens, and clicking it again closes without reopening.
        await outerTrigger.click()
        const outerLayer = page.getByTestId('outer-layer')
        await expect(outerLayer).toBeVisible()
        await expect(outerTrigger).toHaveAttribute('aria-expanded', 'true')

        // Verify GhostPortal moved the layer into document.body (outside <main>).
        const inMain = await outerLayer.evaluate((el) =>
          Boolean(el.closest('main')),
        )
        expect(inMain).toBe(false)

        await outerTrigger.click()
        await expect(outerLayer).toHaveCount(0)
        await expect(outerTrigger).toHaveAttribute('aria-expanded', 'false')

        // Open outer then inner layer, then dismiss via Escape one layer at a time.
        await outerTrigger.click()
        await expect(outerLayer).toBeVisible()

        const innerTrigger = page.getByTestId('inner-trigger')
        await innerTrigger.click()
        const innerLayer = page.getByTestId('inner-layer')
        await expect(innerLayer).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(innerLayer).toHaveCount(0)
        await expect(outerLayer).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(outerLayer).toHaveCount(0)

        // Reopen both layers and dismiss via outside clicks one layer at a time.
        await outerTrigger.click()
        await expect(outerLayer).toBeVisible()
        await innerTrigger.click()
        await expect(innerLayer).toBeVisible()

        // Clicking inside outer layer (outside inner layer) closes only inner.
        await page.getByTestId('outer-layer-body').click()
        await expect(innerLayer).toHaveCount(0)
        await expect(outerLayer).toBeVisible()

        // Clicking completely outside outer layer closes outer.
        await page.getByRole('heading', { name: 'Overlay primitives' }).click()
        await expect(outerLayer).toHaveCount(0)
      } finally {
        await playground.close()
      }
    },
  )
})
