import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostCard basic example passes axe', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=card/basic`)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Quarterly report' }),
    ).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostCard link example is a single tab stop without nested interactives', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=card/link`)
    const link = page.getByRole('link', { name: /Q3 report/i })
    await expect(link).toBeVisible()
    await link.focus()
    await expect(link).toBeFocused()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
