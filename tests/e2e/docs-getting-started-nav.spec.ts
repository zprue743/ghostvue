import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const navLabels = [
  'Docs',
  'Components',
  'Theming',
  'Examples',
  'Contribute',
] as const

test.describe('getting started and docs navigation', () => {
  test('getting-started page renders its title', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/getting-started.html`)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Getting started' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('homepage Get started CTA links to getting-started', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/index.html`)
      const cta = page
        .locator('.ghost-landing__actions')
        .getByRole('link', { name: 'Get started' })
      await expect(cta).toHaveAttribute('href', '/getting-started')
      await cta.click()
      await expect(page).toHaveURL(/getting-started/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Getting started' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('top nav shows the primary items at 1440px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${docs.url}/getting-started.html`)
      const mainNav = page.getByRole('navigation', { name: 'Main Navigation' })
      for (const label of navLabels) {
        await expect(
          mainNav.getByRole('link', { name: label, exact: true }),
        ).toBeVisible()
      }
    } finally {
      await docs.close()
    }
  })

  test('mobile menu lists the primary items at 390px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 800 })
      await page.goto(`${docs.url}/getting-started.html`)
      await page.locator('.VPNavBarHamburger').click()
      const screen = page.locator('.VPNavScreen')
      await expect(screen).toBeVisible()
      for (const label of navLabels) {
        await expect(
          screen.getByRole('link', { name: label, exact: true }),
        ).toBeVisible()
      }
    } finally {
      await docs.close()
    }
  })
})
