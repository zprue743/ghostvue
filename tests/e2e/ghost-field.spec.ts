import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test('GhostField basic example exposes label and input', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=field/basic`)
    const label = page.getByText('Display name', { exact: true })
    await expect(label).toBeVisible()
    const input = page.getByRole('textbox')
    await expect(input).toBeVisible()
    const describedBy = await input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await input.fill('Orion')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})

test('GhostField invalid example announces error', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    await page.goto(`${playground.url}/examples.html?id=field/invalid`)
    const input = page.getByRole('textbox')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toHaveText(
      'Enter at least two characters.',
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  } finally {
    await playground.close()
  }
})
