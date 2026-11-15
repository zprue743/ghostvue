import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostBreadcrumb'

test.describe('GhostBreadcrumb', { tag }, () => {
  test('basic example exposes navigation landmark and passes axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=breadcrumb/basic`)

      const nav = page.getByRole('navigation', { name: 'Project trail' })
      await expect(nav).toBeVisible()

      const list = nav.locator('ol')
      await expect(list).toBeVisible()
      await expect(nav.locator('[aria-current="page"]')).toHaveText('GhostVue')

      const separators = nav.locator('[data-part="separator"]')
      await expect(separators).toHaveCount(2)
      for (const separator of await separators.all()) {
        await expect(separator).toHaveAttribute('aria-hidden', 'true')
      }

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('collapsed example exposes hidden ancestors from ellipsis', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=breadcrumb/collapsed`)

      const nav = page.getByRole('navigation', { name: 'Settings trail' })
      await expect(nav).toBeVisible()

      await nav.getByRole('button', { name: 'Show hidden segments' }).click()

      const catalog = page.getByRole('link', { name: 'Catalog' })
      await expect(catalog).toBeVisible()
      await catalog.focus()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
