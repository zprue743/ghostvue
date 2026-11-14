import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { gotoPlayground, playgroundTest } from '../support/playground'

import { startStaticServer } from './static-server'

test.describe('GhostPagination', () => {
  test('navigates pages with buttons and passes axe', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=pagination/basic`)

      const nav = page.getByRole('navigation', { name: 'Result pages' })
      await expect(nav).toBeVisible()
      await expect(nav.locator('button[aria-current="page"]')).toHaveText('2')

      await nav.getByRole('button', { name: 'Next page' }).click()
      await expect(nav.locator('button[aria-current="page"]')).toHaveText('3')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  playgroundTest(
    'exposes navigation semantics in the playground',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const heading = page.getByRole('heading', {
        name: 'GhostPagination',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const nav = page.getByTestId('pagination-headless')
      await expect(nav).toHaveAttribute('data-ghost-pagination', '')
      await expect(nav.locator('button[aria-current="page"]')).toHaveText('4')
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

  playgroundTest(
    'retains focus on Next at the last page',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const nav = page.getByTestId('pagination-focus-edge')
      const next = nav.getByRole('button', { name: 'Next page' })
      await next.click()
      await next.click()
      await expect(nav.locator('button[aria-current="page"]')).toHaveText('3')
      await expect(next).toBeFocused()
    },
  )

  playgroundTest(
    'retains focus on the activated page button',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const nav = page.getByTestId('pagination-focus-edge')
      const pageThree = nav.getByRole('button', { name: 'Page 3' })
      await pageThree.click()
      await expect(pageThree).toBeFocused()
      await expect(pageThree).toHaveAttribute('aria-current', 'page')
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
})
