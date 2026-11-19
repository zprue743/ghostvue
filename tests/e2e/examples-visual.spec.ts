import { expect, test } from '@playwright/test'

import { ghostExamples } from '../../examples/registry'
import { waitForExamplePreview, type GhostExampleHost } from '../support'
import { startStaticServer } from './static-server'

const modes = ['light', 'dark'] as const

/**
 * Token hosts the baselines cover. The route never adds `.ghost-theme`, never
 * resizes controls, and never pads the canvas from the test, so a screenshot
 * shows what the docs canvas and a consumer app render.
 *
 * - `docs`: the docs first paint (`calm`, density unset). Every example.
 * - `default-comfortable`: the library default theme at an explicit density.
 *   Themed examples only; headless examples have no recipe to vary.
 */
const hosts = [
  { name: 'docs', host: {}, layers: ['headless', 'themed'] },
  {
    name: 'default-comfortable',
    host: { theme: 'default', density: 'comfortable' },
    layers: ['themed'],
  },
] as const satisfies readonly {
  name: string
  host: GhostExampleHost
  layers: readonly string[]
}[]

test.describe('example visual baselines', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  for (const example of ghostExamples) {
    const slug = example.id.replaceAll('/', '-')

    for (const { name, host, layers } of hosts) {
      if (!(layers as readonly string[]).includes(example.layer)) continue
      const suffix = name === 'docs' ? '' : `-${name}`

      test(`${example.id} matches ${name} host snapshots in light and dark`, async ({
        page,
      }) => {
        const playground = await startStaticServer('apps/playground/dist')

        try {
          await page.emulateMedia({ reducedMotion: 'reduce' })

          for (const mode of modes) {
            const preview = await waitForExamplePreview(
              page,
              playground.url,
              example.id,
              { ...host, mode },
            )
            await page.evaluate(() => document.fonts.ready)

            await expect(preview).toHaveScreenshot(
              `${slug}${suffix}-${mode}.png`,
            )
          }
        } finally {
          await playground.close()
        }
      })
    }
  }
})
