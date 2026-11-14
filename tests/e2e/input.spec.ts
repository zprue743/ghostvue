import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostInput', () => {
  test('types, honors states, submits, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostInput',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const search = page.getByLabel('Search reports')
      await search.fill('forecast')
      await expect(page.getByTestId('input-search-value')).toHaveText(
        'forecast',
      )

      const disabled = page.getByLabel('Disabled filter')
      await expect(disabled).toBeDisabled()

      const readonly = page.getByLabel('Readonly owner')
      await expect(readonly).toHaveAttribute('readonly', '')
      await readonly.focus()
      await expect(readonly).toBeFocused()

      const invalid = page.getByLabel('Invalid query')
      await expect(invalid).toHaveAttribute('aria-invalid', 'true')

      const required = page.getByLabel('Required name')
      await expect(required).toHaveAttribute('required', '')

      await page.getByLabel('Submit name').fill('Priya')
      await page.getByTestId('input-submit').click()
      await expect(page.getByTestId('input-submitted')).toHaveText('Priya')

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="input-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
