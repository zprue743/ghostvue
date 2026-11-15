import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostInlineAlert table-error example passes axe', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(
      `${playground.url}/examples.html?id=inline-alert/table-error`,
    )
    await expect(page.getByTestId('table-load-error')).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostInlineAlert live example mounts alert and keeps retry focusable', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=inline-alert/live`)
    await page.getByRole('button', { name: 'Simulate save failure' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByRole('button', { name: 'Retry save' }).focus()
    await expect(page.getByRole('button', { name: 'Retry save' })).toBeFocused()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
