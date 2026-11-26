import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * Full-page baselines for the docs home page (`GhostLanding`). Behavior, the
 * section rail, and axe live in `docs-landing.spec.ts`; this suite only proves
 * the composition: seven full-width sections, their live examples, and the
 * rail, in light and dark at four widths (8 captures).
 *
 * Every capture runs with reduced motion. That removes the scroll-linked
 * intro and outro, so each section is in its final state wherever the page is
 * scrolled, and it stops the rail ghost's idle animation. A full-page capture
 * without it would record sections mid-fade.
 *
 * A full-page capture renders beyond the viewport, and while it does, `vh`
 * and `svh` resolve against the whole page instead of the window. The landing
 * page sizes its section spacing and first-screen hero from viewport height,
 * so an unpinned capture changes the page height while measuring it and never
 * settles. The page routes every such length through `--_landing-vh`; each
 * test pins that one property to the pixels it already resolves to, then
 * proves the page height no longer follows the viewport before capturing.
 *
 * The docs host is never changed from its first paint (`calm`). Apart from
 * that pin, the page is never padded, resized, or restyled by the test.
 */

const modes = ['light', 'dark'] as const

/**
 * Mobile and tablet sit below the 1100px breakpoint where the rail hides;
 * desktop and wide show it. Wide also crosses the 1500px breakpoint where the
 * current section's label stays visible.
 */
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
] as const

test.describe('docs landing visual baselines', { tag: '@visual' }, () => {
  test.use({ deviceScaleFactor: 1 })

  for (const viewport of viewports) {
    for (const mode of modes) {
      test(`home page at ${viewport.name} ${String(viewport.width)}px (${mode})`, async ({
        page,
      }) => {
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript((appearance) => {
            localStorage.setItem('vitepress-theme-appearance', appearance)
          }, mode)
          await page.goto(`${docs.url}/index.html`)

          const html = page.locator('html')
          await expect(html).toHaveAttribute('data-ghost-mode', mode)
          await expect(html).toHaveAttribute('data-ghost-theme', 'calm')

          const landing = page.locator('.ghost-landing')
          // Hydrated, with reduced motion recognised: nothing is animating.
          await expect(landing).toHaveAttribute('data-landing-motion', 'static')
          // Every live example has loaded; none shows a loading placeholder.
          await expect(landing.locator('.ghost-example__status')).toHaveCount(0)
          await expect(
            landing.locator('#hero [data-landing-example]').first(),
          ).toContainText('Release channels')
          // The theming switch mirrors the appearance only after mount.
          await expect(
            landing.getByRole('switch', { name: 'Dark appearance' }),
          ).toHaveAttribute('aria-checked', mode === 'dark' ? 'true' : 'false')

          await page.evaluate(() => document.fonts.ready)
          // Keep the pointer off every control so no capture records hover.
          await page.mouse.move(0, 0)
          await page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'instant' })
          })

          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            ),
          ).toBeLessThanOrEqual(0)

          // Pin the page's one viewport-height input to its current value.
          await page.addStyleTag({
            content: `.ghost-landing { --_landing-vh: ${String(viewport.height / 100)}px; }`,
          })
          const pageHeight = () =>
            page.evaluate(() => document.documentElement.scrollHeight)
          const heightAtRest = await pageHeight()
          // A taller window must not move the layout, or the capture below
          // would resize the page it is measuring.
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height * 3,
          })
          expect(await pageHeight()).toBe(heightAtRest)
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          })
          expect(await pageHeight()).toBe(heightAtRest)

          await expect(page).toHaveScreenshot(
            `docs-landing-${viewport.name}-${mode}.png`,
            { fullPage: true },
          )
        } finally {
          await docs.close()
        }
      })
    }
  }
})
