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
 * The page is captured in a window as tall as the page itself rather than
 * with `fullPage`. A `fullPage` capture renders beyond the viewport, and
 * while it does, viewport-relative lengths resolve against the whole page;
 * on CI that made the page height flip between two values from one capture
 * to the next ("Failed to take two consecutive stable screenshots"). A real
 * window of the page's height has nothing to emulate.
 *
 * That only works because the landing page routes every viewport-height
 * length (section spacing, the first-screen hero, the rail's size and
 * position) through one property, `--_landing-vh`. Each test pins it to the
 * pixels it resolves to at the named viewport, proves the page height no
 * longer follows the window, and then grows the window. The capture is
 * therefore the page as laid out for that viewport, with the rail where a
 * reader first sees it.
 *
 * The docs host is never changed from its first paint (`calm`). Apart from
 * that pin, the page is never padded or restyled by the test.
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
          // A window as tall as the page: everything is in view, so the
          // capture needs no beyond-viewport rendering.
          await page.setViewportSize({
            width: viewport.width,
            height: heightAtRest,
          })
          expect(await pageHeight()).toBe(heightAtRest)
          // Nothing left to scroll, so the rail reports the start of the page.
          if (viewport.width >= 1100) {
            await expect(page.getByTestId('landing-rail-hero')).toHaveAttribute(
              'aria-current',
              'location',
            )
          }
          await page.mouse.move(0, 0)

          await expect(page).toHaveScreenshot(
            `docs-landing-${viewport.name}-${mode}.png`,
          )
        } finally {
          await docs.close()
        }
      })
    }
  }
})
