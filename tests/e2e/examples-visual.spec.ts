import { ghostExamples } from '../../examples/registry'
import { waitForExamplePreview, type GhostExampleHost } from '../support'
import { playgroundTest as test, expect } from '../support/playground'

const modes = ['light', 'dark'] as const

/**
 * Token hosts the baselines cover. The route never adds `.ghost-theme`, never
 * resizes controls, and never pads the canvas from the test, so a screenshot
 * shows what the docs canvas and a consumer app render.
 *
 * - `docs`: the docs first paint (`default`, density unset). Every example.
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
        playgroundUrl,
      }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })

        for (const mode of modes) {
          const preview = await waitForExamplePreview(
            page,
            playgroundUrl,
            example.id,
            { ...host, mode },
          )
          await page.evaluate(() => document.fonts.ready)
          // Server examples fetch on mount; capture the loaded page, not the
          // loading state. Static busy tables (skeleton, spinner) are not
          // DataTable roots and are captured as they are.
          await expect(
            preview.locator('[data-ghost-data-table][aria-busy="true"]'),
          ).toHaveCount(0)

          await expect(preview).toHaveScreenshot(`${slug}${suffix}-${mode}.png`)
        }
      })
    }
  }

  // GHO-222: closed themed panels must collapse to their trigger rows, with no
  // bordered strip of clipped body text, after a controlled Collapse all.
  for (const width of [390, 1280]) {
    test(`accordion/deployment-faq after Collapse all matches ${String(width)}px snapshots in light and dark`, async ({
      page,
      playgroundUrl,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })

      for (const mode of modes) {
        const preview = await waitForExamplePreview(
          page,
          playgroundUrl,
          'accordion/deployment-faq',
          { mode },
        )
        await page.evaluate(() => document.fonts.ready)
        await preview.getByRole('button', { name: 'Collapse all' }).click()
        for (const content of await preview
          .locator('[data-part="content"]')
          .all()) {
          await expect(content).toBeHidden()
        }
        // Keep the activated button's focus ring out of the baseline.
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        })

        await expect(preview).toHaveScreenshot(
          `accordion-deployment-faq-collapsed-${String(width)}-${mode}.png`,
        )
      }
    })
  }
})
