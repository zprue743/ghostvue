import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

const densities = ['compact', 'comfortable', 'spacious'] as const
const roundnesses = [0, 0.5, 1] as const

const heights = {
  compact: { sm: '28px', md: '32px', lg: '40px' },
  comfortable: { sm: '32px', md: '40px', lg: '48px' },
  spacious: { sm: '36px', md: '48px', lg: '48px' },
} as const

const radii = {
  compact: { 0: '0px', 0.5: '2px', 1: '4px' },
  comfortable: { 0: '0px', 0.5: '4px', 1: '8px' },
  spacious: { 0: '0px', 0.5: '6px', 1: '12px' },
} as const

test.describe('density, type, and roundness', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('renders SlButton at every density and roundness', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(playground.url)
      await page.evaluate(() => document.fonts.ready)

      const preview = page.getByTestId('density-preview')
      expect(
        await preview.evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--sl-roundness').trim(),
        ),
      ).toBe('1')

      for (const density of densities) {
        const row = page.getByTestId(`density-row-${density}`)
        await expect(row).toHaveAttribute('data-sl-density', density)

        for (const amount of roundnesses) {
          const key = String(amount)
          const md = page.getByTestId(`density-${density}-roundness-${key}-md`)
          await expect(md).toHaveCSS('min-height', heights[density].md)
          await expect(md).toHaveCSS('border-radius', radii[density][amount])

          await expect(
            page.getByTestId(`density-${density}-roundness-${key}-sm`),
          ).toHaveCSS('min-height', heights[density].sm)
          await expect(
            page.getByTestId(`density-${density}-roundness-${key}-lg`),
          ).toHaveCSS('min-height', heights[density].lg)
        }

        await expect(row).toHaveScreenshot(
          `density-${density}.png`,
          screenshotOptions,
        )
      }
    } finally {
      await playground.close()
    }
  })
})

test.describe('coarse pointer touch floor', () => {
  test.use({
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  })

  test('floors compact and comfortable control heights to 44px', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const coarse = await page.evaluate(
        () => matchMedia('(pointer: coarse)').matches,
      )
      expect(coarse).toBe(true)

      await expect(
        page.getByTestId('density-compact-roundness-1-sm'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-compact-roundness-1-md'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-compact-roundness-1-lg'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-comfortable-roundness-1-sm'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-comfortable-roundness-1-md'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-comfortable-roundness-1-lg'),
      ).toHaveCSS('min-height', '48px')
      await expect(
        page.getByTestId('density-spacious-roundness-1-sm'),
      ).toHaveCSS('min-height', '44px')
      await expect(
        page.getByTestId('density-spacious-roundness-1-md'),
      ).toHaveCSS('min-height', '48px')
    } finally {
      await playground.close()
    }
  })
})
