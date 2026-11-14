import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostTabs'

test.describe('GhostTabs', { tag }, () => {
  test('basic example selects tabs with keyboard and pointer', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=tabs/basic`)

      const list = page.getByRole('tablist')
      await expect(list).toBeVisible()

      const profile = page.getByRole('tab', { name: 'Profile' })
      const billing = page.getByRole('tab', { name: 'Billing' })
      const profilePanel = page.getByRole('tabpanel', { name: 'Profile' })

      await expect(profile).toHaveAttribute('aria-selected', 'true')
      await expect(profilePanel).toBeVisible()

      await billing.click()
      await expect(billing).toHaveAttribute('aria-selected', 'true')
      await expect(
        page.getByRole('tabpanel', { name: 'Billing' }),
      ).toBeVisible()
      await expect(profilePanel).toBeHidden()

      await billing.focus()
      await page.keyboard.press('ArrowRight')
      const security = page.getByRole('tab', { name: 'Security' })
      await expect(security).toBeFocused()
      await expect(security).toHaveAttribute('aria-selected', 'true')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('manual example keeps selection when tabbing into the selected tab', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=tabs/manual`)

      const drafts = page.getByRole('tab', { name: 'Drafts' })
      const sent = page.getByRole('tab', { name: 'Sent' })
      await expect(drafts).toHaveAttribute('aria-selected', 'true')
      await expect(drafts).toHaveAttribute('tabindex', '0')
      await expect(sent).toHaveAttribute('tabindex', '-1')

      await drafts.focus()
      await expect(drafts).toHaveAttribute('aria-selected', 'true')
      await expect(sent).toHaveAttribute('aria-selected', 'false')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
