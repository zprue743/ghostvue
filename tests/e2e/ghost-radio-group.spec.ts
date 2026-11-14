import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostRadioGroup', () => {
  test('roves with arrows and submits the selected value', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostRadioGroup',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const second = page.getByTestId('radio-group-weekly')
      const first = page.getByTestId('radio-group-daily')
      await first.focus()
      await page.keyboard.press('ArrowDown')
      await expect(second).toBeFocused()
      await page.keyboard.press('Space')
      await expect(second).toBeChecked()

      await page.getByRole('button', { name: 'Submit digest cadence' }).click()
      await expect(
        page.getByText('Digest cadence submissions: 1'),
      ).toBeVisible()

      await page.getByTestId('radio-group-form-weekly').check()
      await page.getByRole('button', { name: 'Submit digest cadence' }).click()
      await expect(page.getByText('Digest cadence value: weekly')).toBeVisible()

      const results = await new AxeBuilder({ page })
        .include('[data-testid="radio-group-section"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('example pages pass axe', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      for (const id of [
        'radio-group/basic',
        'radio-group/field',
        'radio-group/form',
        'radio-group/themed',
      ]) {
        await page.goto(`${playground.url}/examples.html?id=${id}`)
        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
      }
    } finally {
      await playground.close()
    }
  })
})
