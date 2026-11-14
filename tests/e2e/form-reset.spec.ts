import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('Native form reset', () => {
  test('restores defaults across inputs after reset settles', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const input = page.getByTestId('form-reset-input')
      const textarea = page.getByTestId('form-reset-textarea')
      const checkbox = page.getByTestId('form-reset-checkbox')
      const toggle = page.getByTestId('form-reset-switch')

      await input.fill('edited-input')
      await textarea.fill('edited-notes')
      await checkbox.click()
      await toggle.click()

      await expect(input).toHaveValue('edited-input')
      await expect(textarea).toHaveValue('edited-notes')
      await expect(checkbox).not.toBeChecked()
      await expect(toggle).toHaveAttribute('aria-checked', 'true')

      await page.getByTestId('form-reset-trigger').click()

      await expect(input).toHaveValue('seed')
      await expect(textarea).toHaveValue('seed')
      await expect(checkbox).toBeChecked()
      await expect(toggle).toHaveAttribute('aria-checked', 'false')
    } finally {
      await playground.close()
    }
  })

  test('honors a canceled reset on edited controls', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const input = page.getByTestId('form-reset-input')
      const toggle = page.getByTestId('form-reset-switch')

      await input.fill('kept-input')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-checked', 'true')

      await page.evaluate(() => {
        const form = document.querySelector<HTMLFormElement>(
          '[data-testid="form-reset-suite"]',
        )
        form?.addEventListener(
          'reset',
          (event) => {
            event.preventDefault()
          },
          { once: true },
        )
      })

      await page.getByTestId('form-reset-trigger').click()

      await expect(input).toHaveValue('kept-input')
      await expect(toggle).toHaveAttribute('aria-checked', 'true')
    } finally {
      await playground.close()
    }
  })
})
