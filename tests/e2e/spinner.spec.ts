import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostSpinner exposes a named status and themed reduced-motion pulse', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(
      `${playground.url}/examples.html?id=${encodeURIComponent('spinner/basic')}`,
    )

    const headless = page
      .getByTestId('ghost-example-preview')
      .getByRole('status')
    // Status is nameFrom: author; the hidden text is live-region content.
    await expect(headless).toHaveText('Loading')
    await expect(headless).toMatchAriaSnapshot('- status: Loading')
    await expect(headless).toHaveClass(/ghost-spinner/)
    await expect(headless).toHaveAttribute('data-part', 'root')

    const basicAxe = await new AxeBuilder({ page }).analyze()
    expect(basicAxe.violations).toEqual([])

    await page.goto(
      `${playground.url}/examples.html?id=${encodeURIComponent('spinner/themed')}`,
    )

    const themedPreview = page.getByTestId('ghost-example-preview')
    const defaultSpinner = themedPreview
      .getByRole('status')
      .filter({ hasText: /^Loading$/ })
    await expect(defaultSpinner).toBeVisible()
    await expect(defaultSpinner).not.toHaveAttribute('data-size')
    await expect(defaultSpinner).not.toHaveAttribute('data-tone')

    const compact = themedPreview
      .getByRole('status')
      .filter({ hasText: 'Loading compact' })
    await expect(compact).toHaveAttribute('data-size', 'sm')

    const spacious = themedPreview
      .getByRole('status')
      .filter({ hasText: 'Loading spacious' })
    await expect(spacious).toHaveAttribute('data-size', 'lg')
    await expect(spacious).toHaveAttribute('data-tone', 'neutral')

    const danger = themedPreview
      .getByRole('status')
      .filter({ hasText: 'Deleting rows' })
    await expect(danger).toHaveAttribute('data-tone', 'danger')

    const spinning = await defaultSpinner.evaluate((element) => {
      const style = getComputedStyle(element, '::before')
      return { animationName: style.animationName, content: style.content }
    })
    expect(spinning.content).not.toBe('none')
    expect(spinning.animationName).toBe('ghost-spinner-spin')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await defaultSpinner.evaluate(
        (element) => getComputedStyle(element, '::before').animationName,
      ),
    ).toBe('ghost-spinner-pulse')

    const themedAxe = await new AxeBuilder({ page }).analyze()
    expect(themedAxe.violations).toEqual([])

    await page.goto(
      `${playground.url}/examples.html?id=${encodeURIComponent('spinner/table-refresh')}`,
    )

    const table = page.getByRole('table', { name: 'Reports' })
    await expect(table).toHaveAttribute('aria-busy', 'true')
    await expect(
      table.getByRole('status').filter({ hasText: 'Refreshing reports' }),
    ).toBeVisible()

    const tableAxe = await new AxeBuilder({ page }).analyze()
    expect(tableAxe.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
