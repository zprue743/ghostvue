import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { gotoPlayground, playgroundTest } from '../support/playground'

import { startStaticServer } from './static-server'

playgroundTest(
  'GhostPagination changes page and exposes navigation semantics',
  async ({ page, playgroundUrl }) => {
    await gotoPlayground(page, playgroundUrl)

    const heading = page.getByRole('heading', {
      name: 'GhostPagination',
      level: 2,
    })
    await expect(heading).toBeVisible()

    const nav = page.getByTestId('pagination-headless')
    await expect(nav).toHaveAttribute('data-ghost-pagination', '')
    await expect(
      nav.getByRole('button', { name: 'Page 4, current page' }),
    ).toBeVisible()
    await expect(page.getByTestId('pagination-page-status')).toHaveText(
      'Paged results: page 4 of 15',
    )

    await nav.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByTestId('pagination-page-status')).toHaveText(
      'Paged results: page 5 of 15',
    )

    const results = await new AxeBuilder({ page })
      .include('[aria-labelledby="pagination-heading"]')
      .analyze()
    expect(results.violations).toEqual([])
  },
)

test('pagination examples pass axe', async ({ page }) => {
  const playground = await startStaticServer('apps/playground/dist')
  try {
    for (const id of [
      'pagination/basic',
      'pagination/controlled',
      'pagination/ellipsis',
      'pagination/themed',
    ] as const) {
      await page.goto(`${playground.url}/examples.html?id=${id}`)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, id).toEqual([])
    }
  } finally {
    await playground.close()
  }
})
