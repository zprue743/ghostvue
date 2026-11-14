import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostSkeleton stays out of the accessibility tree and tab order', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const heading = page.getByRole('heading', { name: 'GhostSkeleton' })
    await expect(heading).toBeVisible()

    const headless = page.getByTestId('headless-skeleton')
    await expect(headless).toHaveAttribute('aria-hidden', 'true')
    await expect(headless).toHaveAttribute('inert', '')
    await expect(headless).toHaveAttribute('data-part', 'root')
    await expect(headless).not.toHaveAttribute('role')
    await expect(headless).not.toHaveAttribute('aria-busy')
    await expect(headless).not.toHaveAttribute('aria-live')

    const themedText = page.getByTestId('themed-skeleton-text')
    await expect(themedText).toHaveAttribute('aria-hidden', 'true')
    await expect(themedText).not.toHaveAttribute('data-shape')
    await expect(themedText).toHaveAttribute('data-themed', '')

    const themedRect = page.getByTestId('themed-skeleton-rect')
    await expect(themedRect).toHaveAttribute('data-shape', 'rect')

    const themedCircle = page.getByTestId('themed-skeleton-circle')
    await expect(themedCircle).toHaveAttribute('data-shape', 'circle')
    const circleBox = await themedCircle.boundingBox()
    expect(circleBox).not.toBeNull()
    expect(
      Math.abs((circleBox?.width ?? 0) - (circleBox?.height ?? 0)),
    ).toBeLessThan(1)

    const smallCircle = page.getByTestId('themed-skeleton-circle-sm')
    const smallBox = await smallCircle.boundingBox()
    expect(smallBox).not.toBeNull()
    expect(
      Math.abs((smallBox?.width ?? 0) - (smallBox?.height ?? 0)),
    ).toBeLessThan(1)

    const table = page.getByTestId('skeleton-table')
    await expect(table).toHaveAttribute('aria-busy', 'true')
    await expect(
      page.getByRole('table', { name: 'Loading invoices' }),
    ).toBeVisible()
    const cells = table.locator('td.ghost-skeleton')
    await expect(cells).toHaveCount(2)
    await expect(cells.first()).toHaveCSS('display', 'table-cell')

    await expect(page.getByRole('status')).toHaveCount(1)

    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="skeleton-heading"]')
      .analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('themed GhostSkeleton shimmer stops under reduced motion', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const themed = page.getByTestId('themed-skeleton-text')
    const animated = await themed.evaluate((element) => {
      const style = getComputedStyle(element, '::after')
      return { animationName: style.animationName, content: style.content }
    })
    expect(animated.content).not.toBe('none')
    expect(animated.animationName).not.toBe('none')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await themed.evaluate((element) => {
      const style = getComputedStyle(element, '::after')
      return { animationName: style.animationName, content: style.content }
    })
    expect(reduced.animationName === 'none' || reduced.content === 'none').toBe(
      true,
    )
  } finally {
    await playground.close()
  }
})
