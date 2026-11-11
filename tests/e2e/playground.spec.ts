import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('playground shell loads without detectable accessibility violations', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    await expect(
      page.getByRole('heading', { name: 'slop-ui playground' }),
    ).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden names icon-only controls without showing the text', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const deleteButton = page.getByRole('button', { name: 'Delete Q3 revenue' })
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
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden reveals a focusable skip link to keyboard users', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    // Clip is on the wrapper; `overflow: hidden` does not shrink the descendant.
    const wrapper = page.locator('header [data-part="root"]')

    await expect(wrapper).toHaveAttribute('data-state', 'hidden')
    const hiddenBox = await wrapper.boundingBox()
    expect(hiddenBox?.width).toBeLessThanOrEqual(1)
    expect(hiddenBox?.height).toBeLessThanOrEqual(1)

    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()

    await expect(wrapper).not.toHaveAttribute('data-state')
    const revealedBox = await wrapper.boundingBox()
    expect(revealedBox?.width).toBeGreaterThan(1)
    expect(revealedBox?.height).toBeGreaterThan(1)
    await expect(skipLink).toBeVisible()

    await skipLink.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    await expect(wrapper).toHaveAttribute('data-state', 'hidden')
    const rehiddenBox = await wrapper.boundingBox()
    expect(rehiddenBox?.width).toBeLessThanOrEqual(1)
  } finally {
    await playground.close()
  }
})

test('SlVisuallyHidden does not introduce horizontal overflow at 320px', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.setViewportSize({ width: 320, height: 256 })
    await page.goto(playground.url)

    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  } finally {
    await playground.close()
  }
})
