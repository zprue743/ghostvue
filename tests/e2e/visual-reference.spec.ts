import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

test.describe('elevation, materials, and gradients', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test(
    'renders recipes in light and dark and matches visual snapshots',
    { tag: '@visual' },
    async ({ page }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(playground.url)
        await page.evaluate(() => document.fonts.ready)

        const elevationLight = page.getByTestId('visual-elevation-light')
        const materialsLight = page.getByTestId('visual-materials-light')
        const gradientsLight = page.getByTestId('visual-gradients-light')
        const elevationDark = page.getByTestId('visual-elevation-dark')
        const materialsDark = page.getByTestId('visual-materials-dark')
        const gradientsDark = page.getByTestId('visual-gradients-dark')

        const raised = elevationLight.locator('[data-elevation="3"]')
        await expect(raised).toHaveCSS('box-shadow', /oklch|rgb/)
        await expect(raised).not.toHaveCSS('box-shadow', 'none')

        const glass = materialsLight.locator('[data-material="glass"]')
        const backdrop = await glass.evaluate((element) => {
          const style = getComputedStyle(element)
          return (
            style.backdropFilter || style.getPropertyValue('backdrop-filter')
          )
        })
        expect(backdrop).toMatch(/blur\(/)

        const hairlineWidth = await raised.evaluate(
          (element) => getComputedStyle(element).borderTopWidth,
        )
        expect(hairlineWidth).toBe('1px')

        await expect(elevationLight).toHaveScreenshot(
          'elevation-light.png',
          screenshotOptions,
        )
        await expect(materialsLight).toHaveScreenshot(
          'materials-light.png',
          screenshotOptions,
        )
        await expect(gradientsLight).toHaveScreenshot(
          'gradients-light.png',
          screenshotOptions,
        )
        await expect(elevationDark).toHaveScreenshot(
          'elevation-dark.png',
          screenshotOptions,
        )
        await expect(materialsDark).toHaveScreenshot(
          'materials-dark.png',
          screenshotOptions,
        )
        await expect(gradientsDark).toHaveScreenshot(
          'gradients-dark.png',
          screenshotOptions,
        )
      } finally {
        await playground.close()
      }
    },
  )

  test('forced colors drop decorative elevation and glass treatments', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ forcedColors: 'active' })
      await page.goto(playground.url)

      const raised = page
        .getByTestId('visual-elevation-light')
        .locator('[data-elevation="3"]')
      const glass = page
        .getByTestId('visual-materials-light')
        .locator('[data-material="glass"]')

      await expect(raised).toHaveCSS('box-shadow', 'none')
      const backdrop = await glass.evaluate(
        (element) => getComputedStyle(element).backdropFilter,
      )
      expect(backdrop === 'none' || backdrop === '').toBe(true)
    } finally {
      await playground.close()
    }
  })
})
