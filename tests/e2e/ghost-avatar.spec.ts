import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostAvatar basic example passes axe', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=avatar/basic`)
    await expect(page.getByText('JD')).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostAvatar fallback example keeps custom fallback visible', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=avatar/fallback`)
    await expect(page.getByText('👻')).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostAvatar themed example exposes size hooks', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=avatar/themed`)
    await expect(page.locator('.ghost-avatar[data-size="sm"]')).toBeVisible()
    await expect(page.locator('.ghost-avatar:not([data-size])')).toBeVisible()
    await expect(page.locator('.ghost-avatar[data-size="lg"]')).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
