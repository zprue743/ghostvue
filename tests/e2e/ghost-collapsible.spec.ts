import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostCollapsible @component:GhostCollapsible', () => {
  test('basic example toggles disclosure state with accessible relationships', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=collapsible/basic`)

      const trigger = page.getByRole('button', {
        name: 'Show fulfillment trace',
      })
      const panel = page.locator('[data-part="content"]')

      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(panel).toHaveAttribute('hidden', '')

      await trigger.click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(panel).not.toHaveAttribute('hidden', '')

      const results = await new AxeBuilder({ page })
        .include('[data-part="trigger"]')
        .include('[data-part="content"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('themed example renders trigger and content with theme classes', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=collapsible/themed`)

      await expect(
        page.getByRole('button', { name: 'Reveal inventory adjustments' }),
      ).toHaveClass(/ghost-collapsible-trigger/)
      await expect(page.locator('.ghost-collapsible-content')).toBeAttached()
    } finally {
      await playground.close()
    }
  })
})
