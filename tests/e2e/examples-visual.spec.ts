import { expect, test } from '@playwright/test'

import { ghostExamples } from '../../examples/registry'
import { startStaticServer } from './static-server'

const modes = ['light', 'dark'] as const

test.describe('example visual baselines', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  for (const example of ghostExamples) {
    test(`${example.id} matches default-theme comfortable snapshots in light and dark`, async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(
          `${playground.url}/examples.html?id=${encodeURIComponent(example.id)}`,
        )

        const preview = page.getByTestId('ghost-example-preview')
        await expect(preview).toBeVisible()
        await expect(preview).toHaveAttribute('data-example-id', example.id)
        // Examples load asynchronously via defineAsyncComponent; wait until the first child mounts.
        await expect(preview.locator(':scope > *').first()).toBeAttached()
        await page.evaluate(() => document.fonts.ready)

        // Pad the preview clip so box-shadows on edge controls are not cropped.
        await preview.evaluate((element) => {
          element.style.padding = '12px'
        })

        const slug = example.id.replaceAll('/', '-')

        for (const mode of modes) {
          await page.evaluate((targetMode) => {
            const root = document.documentElement
            root.classList.add('ghost-theme')
            root.setAttribute('data-ghost-theme', 'default')
            root.setAttribute('data-ghost-density', 'comfortable')
            root.setAttribute('data-ghost-mode', targetMode)
          }, mode)

          await expect(preview).toHaveScreenshot(`${slug}-${mode}.png`)
        }
      } finally {
        await playground.close()
      }
    })
  }
})
