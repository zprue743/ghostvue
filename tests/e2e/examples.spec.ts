import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { ghostExamples } from '../../examples/registry'
import { startStaticServer } from './static-server'

test.describe('registered examples', () => {
  for (const example of ghostExamples) {
    test(`${example.id} renders and has no axe violations`, async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(
          `${playground.url}/examples.html?id=${encodeURIComponent(example.id)}`,
        )

        const preview = page.getByTestId('ghost-example-preview')
        await expect(preview).toBeVisible()
        await expect(preview).toHaveAttribute('data-example-id', example.id)
        await expect(
          page.getByRole('heading', { name: example.title, level: 1 }),
        ).toBeVisible()

        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
      } finally {
        await playground.close()
      }
    })
  }

  test('gallery lists every registered example', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html`)
      await expect(
        page.getByRole('heading', { name: 'GhostVue examples' }),
      ).toBeVisible()

      for (const example of ghostExamples) {
        await expect(page.getByRole('link', { name: example.id })).toBeVisible()
      }

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
