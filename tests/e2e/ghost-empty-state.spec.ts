import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostEmptyState basic example passes axe', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=empty-state/basic`)
    await expect(
      page.getByRole('heading', { name: 'No reports yet' }),
    ).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostEmptyState filtered example keeps the action focusable', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=empty-state/filtered`)
    await page.getByRole('button', { name: 'Clear filters' }).focus()
    await expect(
      page.getByRole('button', { name: 'Clear filters' }),
    ).toBeFocused()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
