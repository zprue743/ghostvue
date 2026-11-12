import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.05,
}

const flagships = ['calm', 'vibrant', 'mono'] as const
const modes = ['light', 'dark'] as const

async function pinShot(shot: {
  evaluate: (fn: (element: HTMLElement) => void) => Promise<void>
}) {
  await shot.evaluate((element) => {
    element.style.boxSizing = 'border-box'
    element.style.height = '232px'
    element.style.overflow = 'hidden'
    element.style.width = '1240px'
  })
}

test.describe('Flagship GhostButton matrices', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('snapshots each flagship in light and dark', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.evaluate(() => document.fonts.ready)

      for (const theme of flagships) {
        const host = page.getByTestId(`button-state-matrix-${theme}`)
        await expect(host.locator('.mode-block').first()).toHaveAttribute(
          'data-ghost-theme',
          theme,
        )

        for (const mode of modes) {
          const shot = page.getByTestId(
            `button-matrix-shot-${theme}-${mode}-comfortable`,
          )
          await pinShot(shot)
          await expect(shot).toHaveScreenshot(
            `button-matrix-${theme}-${mode}.png`,
            {
              ...screenshotOptions,
              mask: [shot.locator('.cell-label'), shot.locator('.tone-label')],
            },
          )
        }
      }
    } finally {
      await playground.close()
    }
  })
})
