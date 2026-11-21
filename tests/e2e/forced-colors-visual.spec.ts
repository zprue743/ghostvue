import { expect, test, type Locator, type Page } from '@playwright/test'

import type { GhostExampleId } from '../../examples/registry'
import { waitForExamplePreview } from '../support'
import { startStaticServer } from './static-server'

/**
 * Forced-colors (Windows High Contrast) baselines for the key interactive
 * families beyond GhostButton, which has its own matrix in
 * button-states.spec.ts. One themed example per family on the default theme,
 * light mode, comfortable density, so a shot shows what a consumer app paints
 * when the OS forces system colors. Overlays are opened first and the
 * floating surface is captured, because forced colors repaint its elevation.
 *
 * Kept deliberately small: each entry is one screenshot.
 */
interface ForcedColorsCase {
  id: GhostExampleId
  /** Opens an overlay and returns the surface to capture instead of the preview. */
  open?: (page: Page) => Promise<Locator>
}

const cases: readonly ForcedColorsCase[] = [
  // Fields and inputs: disabled, readonly, invalid, and required states.
  { id: 'input/states' },
  { id: 'number-input/themed' },
  // Checkboxes, radios, switches.
  { id: 'checkbox/themed' },
  { id: 'radio-group/themed' },
  { id: 'switch/states' },
  // Dialogs and overlays.
  {
    id: 'dialog/themed',
    open: async (page) => {
      await page.getByRole('button', { name: "What's new in 4.2" }).click()
      return page.getByRole('dialog')
    },
  },
  // Menus, selects, comboboxes: the open listbox shows the checked option.
  {
    id: 'select/themed',
    open: async (page) => {
      await page.getByRole('combobox').first().click()
      return page.getByRole('listbox')
    },
  },
  // Tabs and accordions.
  { id: 'tabs/themed' },
  { id: 'accordion/themed' },
  // Progress and sliders.
  { id: 'progress/themed' },
  { id: 'slider/vertical' },
  // Selection grids: selected day and current page.
  { id: 'calendar/themed' },
  { id: 'pagination/themed' },
]

test.describe('forced-colors visual baselines', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  for (const { id, open } of cases) {
    test(`${id} matches the forced-colors snapshot`, async ({ page }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.emulateMedia({
          forcedColors: 'active',
          reducedMotion: 'reduce',
        })
        const preview = await waitForExamplePreview(page, playground.url, id, {
          theme: 'default',
          density: 'comfortable',
          mode: 'light',
        })
        await page.evaluate(() => document.fonts.ready)

        const target = open ? await open(page) : preview
        await expect(target).toBeVisible()
        // Forced colors remove every decorative shadow on the captured surface.
        await expect(target).toHaveCSS('box-shadow', 'none')

        await expect(target).toHaveScreenshot(
          `${id.replaceAll('/', '-')}-forced-colors.png`,
        )
      } finally {
        await playground.close()
      }
    })
  }
})

test.describe('forced-colors checked indicators', () => {
  test('radio and select checked states keep a Highlight indicator', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ forcedColors: 'active' })
      await waitForExamplePreview(page, playground.url, 'radio-group/themed', {
        theme: 'default',
        mode: 'light',
      })

      // Without the recipe the dot's fill is forced to Canvas and vanishes.
      const checked = page.getByRole('radio', { checked: true })
      await expect(checked).toHaveCSS('forced-color-adjust', 'none')
      const dot = await checked.evaluate(
        (element) => getComputedStyle(element, '::after').backgroundColor,
      )
      const canvas = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.backgroundColor = 'Canvas'
        document.body.append(probe)
        const color = getComputedStyle(probe).backgroundColor
        probe.remove()
        return color
      })
      expect(dot).not.toBe(canvas)

      await waitForExamplePreview(page, playground.url, 'select/themed', {
        theme: 'default',
        mode: 'light',
      })
      await page.getByRole('combobox').first().click()
      const option = page.getByRole('option', { selected: true })
      await expect(option).toHaveCSS('forced-color-adjust', 'none')
    } finally {
      await playground.close()
    }
  })
})
