import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostRadioGroup', () => {
  test('arrow keys select without Space and shared name is generated', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostRadioGroup',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const daily = page.getByTestId('radio-group-daily')
      const weekly = page.getByTestId('radio-group-weekly')
      await daily.focus()
      await page.keyboard.press('ArrowDown')
      await expect(weekly).toBeFocused()
      await expect(weekly).toBeChecked()

      const implicitA = page.getByTestId('radio-group-implicit-a')
      const implicitB = page.getByTestId('radio-group-implicit-b')
      const nameA = await implicitA.getAttribute('name')
      const nameB = await implicitB.getAttribute('name')
      expect(nameA).toBeTruthy()
      expect(nameA).toBe(nameB)

      await page.getByRole('button', { name: 'Submit digest cadence' }).click()
      await expect(
        page.getByText('Digest cadence submissions: 1'),
      ).toBeVisible()

      await page.getByTestId('radio-group-form-weekly').check()
      await page.getByRole('button', { name: 'Submit digest cadence' }).click()
      await expect(page.getByText('Digest cadence value: weekly')).toBeVisible()

      const rtlFirst = page.getByTestId('radio-group-rtl-first')
      const rtlSecond = page.getByTestId('radio-group-rtl-second')
      await rtlFirst.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(rtlSecond).toBeFocused()
      await expect(rtlSecond).toBeChecked()

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
