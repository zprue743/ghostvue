import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSwitch', () => {
  test('toggles from pointer and keyboard, participates in forms, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostSwitch',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const airplane = page.getByRole('switch', { name: 'Airplane mode' })
      await expect(airplane).toHaveAttribute('aria-checked', 'false')
      await airplane.click()
      await expect(airplane).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByText('Airplane: on')).toBeVisible()

      await airplane.focus()
      await page.keyboard.press('Space')
      await expect(airplane).toHaveAttribute('aria-checked', 'false')
      await page.keyboard.press('Enter')
      await expect(airplane).toHaveAttribute('aria-checked', 'true')

      await page.getByText('Airplane mode', { exact: true }).click()
      await expect(airplane).toHaveAttribute('aria-checked', 'false')

      const disabled = page.getByRole('switch', { name: 'Disabled alerts' })
      await expect(disabled).toBeDisabled()
      await expect(disabled).toHaveAttribute('aria-checked', 'true')

      const readonly = page.getByRole('switch', { name: 'Read-only policy' })
      await expect(readonly).toHaveAttribute('aria-readonly', 'true')
      await readonly.click()
      await expect(readonly).toHaveAttribute('aria-checked', 'true')

      const digest = page.getByRole('switch', { name: 'Daily digest' })
      await expect(digest).toHaveAttribute('aria-checked', 'true')
      await page.getByRole('button', { name: 'Save digest' }).click()
      await expect(page.getByText('Digest submitted: daily')).toBeVisible()

      await digest.click()
      await page.getByRole('button', { name: 'Save digest' }).click()
      await expect(page.getByText('Digest submitted: off')).toBeVisible()

      await digest.click()
      await page.getByRole('button', { name: 'Reset digest' }).click()
      await expect(digest).toHaveAttribute('aria-checked', 'true')

      const themed = page.getByRole('switch', { name: 'Dark mode' })
      const track = themed.locator('[data-part="track"]')
      const box = await track.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.height).toBeGreaterThan(8)
      expect(box?.width).toBeGreaterThan(box?.height ?? 0)

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="switch-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
