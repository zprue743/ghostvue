import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { measureFocusChange } from './focus-appearance'
import { startStaticServer } from './static-server'

const themes = ['default', 'calm', 'vibrant', 'mono'] as const

/** The desktop switcher in the nav bar (the mobile menu renders a copy). */
function navSwitcher(page: Page): Locator {
  return page.locator('.VPNavBar').getByRole('radiogroup', {
    name: 'Documentation theme',
  })
}

/**
 * Tab into the switcher from the control just before it in the nav bar.
 * Retries until hydration has wired the roving tab stop.
 */
async function tabIntoSwitcher(page: Page, group: Locator): Promise<void> {
  const before = page.locator('.VPNavBar .VPSocialLinks a').last()
  await expect(async () => {
    await before.focus()
    await page.keyboard.press('Tab')
    await expect(group.getByRole('radio', { checked: true })).toBeFocused({
      timeout: 500,
    })
  }).toPass()
}

test.describe('docs theme switcher', () => {
  test('boots into default on first paint and persists a flagship choice', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(docs.url)
      const root = page.locator('html')
      await expect(root).toHaveAttribute('data-ghost-theme', 'default')
      await expect(
        page.getByTestId('docs-theme-default').first(),
      ).toHaveAttribute('aria-checked', 'true')

      await page.getByTestId('docs-theme-vibrant').first().click()
      await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
      expect(
        await page.evaluate(() => localStorage.getItem('ghost-docs-theme')),
      ).toBe('vibrant')

      await page.reload()
      await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
      await expect(
        page.getByTestId('docs-theme-vibrant').first(),
      ).toHaveAttribute('aria-checked', 'true')
    } finally {
      await docs.close()
    }
  })

  test('the translucent desktop navbar keeps the dark theme canvas color', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
      await page.goto(`${docs.url}/components/`)
      const root = page.locator('html')
      await expect(root).toHaveAttribute('data-ghost-mode', 'dark')
      const bar = page.locator('.VPNavBar.has-sidebar .content-body')

      for (const theme of themes) {
        await navSwitcher(page).getByTestId(`docs-theme-${theme}`).click()
        await expect(root).toHaveAttribute('data-ghost-theme', theme)
        await expect
          .poll(async () =>
            bar.evaluate((element) => {
              const style = getComputedStyle(element)
              const canvas = document.createElement('canvas')
              canvas.width = 1
              canvas.height = 1
              const context = canvas.getContext('2d')
              if (!context) throw new Error('Could not sample navbar color')

              // Normalize through the same sRGB canvas to compare color and alpha.
              const sample = (color: string, opacity = 1): number[] => {
                context.clearRect(0, 0, 1, 1)
                context.globalAlpha = opacity
                context.fillStyle = color
                context.fillRect(0, 0, 1, 1)
                return Array.from(context.getImageData(0, 0, 1, 1).data)
              }

              const switcher = element.querySelector(
                '.ghost-docs-theme-switcher',
              )
              if (!switcher)
                throw new Error('Could not find the theme switcher')
              const canvasColor = style
                .getPropertyValue('--ghost-surface-bg')
                .trim()
              const surfaces = [
                [style.backgroundColor, 0.88],
                [getComputedStyle(switcher).backgroundColor, 0.82],
              ] as const
              return Math.max(
                ...surfaces.flatMap(([color, opacity]) => {
                  const expected = sample(canvasColor, opacity)
                  return sample(color).map((channel, index) =>
                    Math.abs(channel - (expected[index] ?? 0)),
                  )
                }),
              )
            }),
          )
          .toBeLessThanOrEqual(1)
      }
    } finally {
      await docs.close()
    }
  })

  test('appearance toggle stays responsive and syncs data-ghost-mode', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/button`)
      const root = page.locator('html')
      await expect(root).toHaveAttribute('data-ghost-mode', 'light')
      await page.evaluate(() => {
        const counter = window as unknown as { classWrites: number }
        counter.classWrites = 0
        new MutationObserver((records) => {
          counter.classWrites += records.length
        }).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        })
      })
      const toggle = page.locator('.VPNavBar .VPSwitchAppearance').first()
      for (const mode of ['dark', 'light', 'dark', 'light']) {
        await toggle.click({ timeout: 2_000 })
        await expect(root).toHaveAttribute('data-ghost-mode', mode)
        await expect(root).toHaveAttribute('data-ghost-theme', /.+/)
      }
      const writes = await page.evaluate(
        () => (window as unknown as { classWrites: number }).classWrites,
      )
      expect(writes).toBeLessThan(40)
    } finally {
      await docs.close()
    }
  })

  test('is one Tab stop and arrow keys move focus and the checked theme @cross-browser', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/button`)
      const root = page.locator('html')
      const group = navSwitcher(page)
      const radio = (name: string) =>
        group.getByRole('radio', { name, exact: true })

      // Tab lands on the checked theme only, then leaves the group.
      await tabIntoSwitcher(page, group)
      await expect(radio('Default')).toBeFocused()
      await page.keyboard.press('Tab')
      expect(
        await group.evaluate((node) => node.contains(document.activeElement)),
      ).toBe(false)
      await page.keyboard.press('Shift+Tab')
      await expect(radio('Default')).toBeFocused()

      // Arrows move focus and check, wrapping at both ends.
      const steps = [
        ['ArrowRight', 'Calm', 'calm'],
        ['ArrowRight', 'Vibrant', 'vibrant'],
        ['ArrowRight', 'Mono', 'mono'],
        ['ArrowRight', 'Default', 'default'],
        ['ArrowLeft', 'Mono', 'mono'],
        ['Home', 'Default', 'default'],
        ['End', 'Mono', 'mono'],
        ['ArrowDown', 'Default', 'default'],
        ['ArrowUp', 'Mono', 'mono'],
      ] as const
      for (const [key, label, theme] of steps) {
        await page.keyboard.press(key)
        await expect(radio(label), `${key} focuses ${label}`).toBeFocused()
        await expect(radio(label)).toHaveAttribute('aria-checked', 'true')
        await expect(root).toHaveAttribute('data-ghost-theme', theme)
        await expect(group.getByRole('radio', { checked: true })).toHaveCount(1)
      }
      expect(
        await page.evaluate(() => localStorage.getItem('ghost-docs-theme')),
      ).toBe('mono')

      // The roving stop follows the checked theme after a reload.
      await page.reload()
      await tabIntoSwitcher(page, group)
      await expect(radio('Mono')).toBeFocused()

      // Space and Enter keep the focused, already checked theme.
      await page.keyboard.press('Space')
      await page.keyboard.press('Enter')
      await expect(root).toHaveAttribute('data-ghost-theme', 'mono')
    } finally {
      await docs.close()
    }
  })

  for (const mode of ['light', 'dark'] as const) {
    test(`passes axe for every theme and keeps an unclipped focus ring (${mode})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.addInitScript((appearance) => {
          localStorage.setItem('vitepress-theme-appearance', appearance)
        }, mode)
        await page.goto(`${docs.url}/components/button`)
        await expect(page.locator('html')).toHaveAttribute(
          'data-ghost-mode',
          mode,
        )
        const group = navSwitcher(page)
        await tabIntoSwitcher(page, group)
        await page.keyboard.press('Home')
        // 1280px shows the full strip; 800px the compact one inside the
        // nav bar's `overflow: hidden` content row, which must not clip it.
        for (const width of [1280, 800]) {
          await page.setViewportSize({ width, height: 720 })
          for (const theme of themes) {
            if (theme !== themes[0]) await page.keyboard.press('ArrowRight')
            await expect(page.locator('html')).toHaveAttribute(
              'data-ghost-theme',
              theme,
            )
            const scan = await new AxeBuilder({ page })
              .include('.VPNavBar .ghost-docs-theme-switcher')
              .analyze()
            expect(scan.violations, `${theme} at ${String(width)}px`).toEqual(
              [],
            )
            const focused = group.getByRole('radio', { checked: true })
            const element = await focused.elementHandle()
            const change = await measureFocusChange(page, element, {
              inflate: 5,
              baselines: [
                {
                  away: () =>
                    element.evaluate((node) => {
                      if (node instanceof HTMLElement) node.blur()
                    }),
                  back: () =>
                    element.evaluate((node) => {
                      if (node instanceof HTMLElement) node.focus()
                    }),
                },
              ],
            })
            expect(change.area, `${theme} ring area`).toBeGreaterThanOrEqual(
              change.perimeter,
            )
            for (const [side, coverage] of Object.entries(change.sides)) {
              expect(
                coverage,
                `${theme} ring ${side} edge at ${String(width)}px`,
              ).toBeGreaterThanOrEqual(0.5)
            }
            expect(change.shifted).toBe(false)
          }
          await page.keyboard.press('ArrowRight')
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('keeps the checked theme visible in forced colors', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({ forcedColors: 'active' })
      await page.goto(`${docs.url}/components/button`)
      const group = navSwitcher(page)
      await expect(
        group.getByRole('radio', { name: 'Default', exact: true }),
      ).toHaveAttribute('aria-checked', 'true')
      /*
       * Computed colours cannot answer this: forced colours keep a
       * transparent fill transparent, so a checked option repainted to
       * Canvas still "differs" from its neighbours on paper. Compare what
       * was painted instead: the checked fill must stand out from an
       * unchecked option by 3:1, and its label from that fill by 4.5:1.
       */
      const paint = async (name: string): Promise<string> =>
        (
          await group
            .getByRole('radio', { name, exact: true })
            .screenshot({ animations: 'disabled' })
        ).toString('base64')
      const [checked, unchecked] = [
        await paint('Default'),
        await paint('Vibrant'),
      ]
      const ratios = await page.evaluate(
        async ([on, off]) => {
          async function load(base64: string): Promise<ImageData> {
            const blob = await (
              await fetch(`data:image/png;base64,${base64}`)
            ).blob()
            const bitmap = await createImageBitmap(blob)
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
            const context = canvas.getContext('2d')
            if (!context) throw new Error('2D canvas context is required')
            context.drawImage(bitmap, 0, 0)
            return context.getImageData(0, 0, bitmap.width, bitmap.height)
          }
          const luminance = (image: ImageData, x: number, y: number) => {
            const index = (y * image.width + x) * 4
            const channel = (value: number): number => {
              const srgb = value / 255
              return srgb <= 0.03928
                ? srgb / 12.92
                : ((srgb + 0.055) / 1.055) ** 2.4
            }
            return (
              0.2126 * channel(image.data[index] ?? 0) +
              0.7152 * channel(image.data[index + 1] ?? 0) +
              0.0722 * channel(image.data[index + 2] ?? 0)
            )
          }
          const ratio = (a: number, b: number) =>
            (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
          const onImage = await load(on)
          const offImage = await load(off)
          // Inside the padding, clear of the rounded corners and the label.
          const y = Math.floor(onImage.height / 2)
          const fill = luminance(onImage, 3, y)
          let label = fill
          for (let x = 0; x < onImage.width; x += 1) {
            const value = luminance(onImage, x, y)
            if (ratio(value, fill) > ratio(label, fill)) label = value
          }
          return {
            fillVersusUnchecked: ratio(fill, luminance(offImage, 3, y)),
            labelVersusFill: ratio(label, fill),
          }
        },
        [checked, unchecked] as const,
      )
      expect(ratios.fillVersusUnchecked).toBeGreaterThanOrEqual(3)
      expect(ratios.labelVersusFill).toBeGreaterThanOrEqual(4.5)
    } finally {
      await docs.close()
    }
  })

  test('the mobile menu copy is keyboard operable too', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${docs.url}/components/button`)
      const hamburger = page.locator('.VPNavBar .VPNavBarHamburger')
      const group = page
        .locator('.VPNavScreen')
        .getByRole('radiogroup', { name: 'Documentation theme' })
      await expect(async () => {
        if (!(await group.isVisible())) await hamburger.click()
        await expect(group).toBeVisible({ timeout: 500 })
      }).toPass()
      await group.getByRole('radio', { checked: true }).focus()
      await page.keyboard.press('ArrowRight')
      const nextOption = group.getByRole('radio', {
        name: 'Calm',
        exact: true,
      })
      await expect(nextOption).toBeFocused()
      await expect(nextOption).toHaveAttribute('aria-checked', 'true')
      await expect(page.locator('html')).toHaveAttribute(
        'data-ghost-theme',
        'calm',
      )
      // Both copies read the shared attribute, so the hidden nav bar copy
      // agrees and offers the same roving stop when the viewport widens.
      await expect(
        page.locator('.VPNavBar [data-testid="docs-theme-calm"]'),
      ).toHaveAttribute('aria-checked', 'true')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    } finally {
      await docs.close()
    }
  })
})
