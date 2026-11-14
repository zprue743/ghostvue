import {
  expect,
  expectFocus,
  gotoPlayground,
  playgroundTest,
  pressSequence,
} from '../support'

playgroundTest.describe('GhostVisuallyHidden', () => {
  playgroundTest(
    'names icon-only controls without showing the text',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const deleteButton = page.getByRole('button', {
        name: 'Delete Q3 revenue',
      })
      await expect(deleteButton).toBeVisible()

      const label = deleteButton.locator('[data-state="hidden"]')
      const box = await label.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.width).toBeLessThanOrEqual(1)
      expect(box?.height).toBeLessThanOrEqual(1)

      await expect(
        page.getByRole('columnheader', { name: 'Actions' }),
      ).toBeAttached()

      await deleteButton.click()
      await expect(
        page.getByRole('button', { name: 'Delete Q3 revenue' }),
      ).toHaveCount(0)
      await expect(page.getByRole('status')).toHaveText('Deleted Q3 revenue')
    },
  )

  playgroundTest(
    'reveals a focusable skip link to keyboard users',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const skipLink = page.getByRole('link', { name: 'Skip to content' })
      // Clip is on the wrapper; `overflow: hidden` does not shrink the descendant.
      const wrapper = page.locator('header [data-part="root"]')

      await expect(wrapper).toHaveAttribute('data-state', 'hidden')
      const hiddenBox = await wrapper.boundingBox()
      expect(hiddenBox?.width).toBeLessThanOrEqual(1)
      expect(hiddenBox?.height).toBeLessThanOrEqual(1)

      await pressSequence(page, ['Tab'])
      await expectFocus(skipLink)

      await expect(wrapper).not.toHaveAttribute('data-state')
      const revealedBox = await wrapper.boundingBox()
      expect(revealedBox?.width).toBeGreaterThan(1)
      expect(revealedBox?.height).toBeGreaterThan(1)
      await expect(skipLink).toBeVisible()

      await skipLink.press('Enter')
      await expectFocus(page.locator('#main'))

      await expect(wrapper).toHaveAttribute('data-state', 'hidden')
      const rehiddenBox = await wrapper.boundingBox()
      expect(rehiddenBox?.width).toBeLessThanOrEqual(1)
    },
  )

  playgroundTest(
    'does not introduce horizontal overflow at 320px',
    async ({ page, playgroundUrl }) => {
      await page.setViewportSize({ width: 320, height: 256 })
      await gotoPlayground(page, playgroundUrl)

      const overflows = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      )
      expect(overflows).toBe(false)
    },
  )
})
