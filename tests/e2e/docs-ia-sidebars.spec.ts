import { expect, test } from '@playwright/test'

import { generatedComponentCatalog } from '../../apps/docs/.vitepress/docs-nav'
import { startStaticServer } from './static-server'

const catalogCategories = generatedComponentCatalog.map(
  (group) => group.category,
)

test.describe('docs IA sidebars', () => {
  test('button page uses the Components sidebar without Standards', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/button`)
      const sidebar = page.locator('.VPSidebar')
      await expect(
        sidebar.getByRole('link', { name: 'Overview' }),
      ).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Button' })).toBeVisible()
      await expect(
        sidebar.getByRole('link', { name: 'Code style' }),
      ).toHaveCount(0)
    } finally {
      await docs.close()
    }
  })

  test('spec page uses the Contribute sidebar with Specifications', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/specs/button`)
      const sidebar = page.locator('.VPSidebar')
      await expect(
        sidebar.getByRole('link', { name: 'Spec template' }),
      ).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Button' })).toBeVisible()
      await expect(
        sidebar.getByRole('link', { name: 'Workflow' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('components overview lists every catalog category', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components`)
      const catalog = page.locator('.ghost-component-catalog')
      await expect(catalog).toBeVisible()
      for (const category of catalogCategories) {
        await expect(
          catalog.getByRole('heading', { name: category }),
        ).toBeVisible()
      }
    } finally {
      await docs.close()
    }
  })
})
