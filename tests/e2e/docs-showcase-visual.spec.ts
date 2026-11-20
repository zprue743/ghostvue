import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  exampleSourceToggle,
  openExampleSource,
  openPreviewWidth,
} from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * Real-docs baselines for the ten redesigned hero showcases: each component
 * page's first example, captured in the built VitePress site rather than the
 * playground route. `examples-visual.spec.ts` already proves each example on
 * its own canvas; this suite proves the docs composition around it (DemoPreview
 * frame, toolbar, `.vp-doc` isolation, docs token host, body-portaled panels)
 * at real browser widths.
 *
 * The matrix is deliberately proportionate:
 * - every hero, source closed, at 390px and 1280px in light and dark (40);
 * - each overlay hero open, trigger plus body-portaled panel, at the same two
 *   widths in light and dark (20);
 * - representative source-open captures at 320px and 768px (4);
 * - one preview-width (container) resize at a desktop browser width (2), kept
 *   separate from the browser-width captures because it narrows the query
 *   container without changing the viewport.
 *
 * The docs host is never changed from its first paint: `calm`, density unset.
 * The suite never pads, resizes, or restyles the canvas, and uses the
 * project-wide diff tolerance.
 */

const modes = ['light', 'dark'] as const
type Mode = (typeof modes)[number]

const heroes = [
  { slug: 'button', id: 'button/action-bar' },
  { slug: 'input', id: 'input/account-details' },
  { slug: 'dialog', id: 'dialog/edit-profile' },
  { slug: 'table', id: 'table/team-directory' },
  { slug: 'dropdown-menu', id: 'dropdown-menu/record-actions' },
  { slug: 'select', id: 'select/billing-preferences' },
  { slug: 'combobox', id: 'combobox/assignee-search' },
  { slug: 'checkbox', id: 'checkbox/notification-preferences' },
  { slug: 'tabs', id: 'tabs/workspace' },
  { slug: 'popover', id: 'popover/share-settings' },
] as const

/** Phone and desktop widths every hero is captured at. */
const heroWidths = [390, 1280] as const
const viewportHeight = 900

async function openHero(
  page: Page,
  url: string,
  slug: string,
  id: string,
  mode: Mode,
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/${slug}.html`)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-ghost-mode', mode)
  // The docs first paint: `calm` tokens, no density override.
  await expect(html).toHaveAttribute('data-ghost-theme', 'calm')
  await expect(html).not.toHaveAttribute('data-ghost-density', /.*/)
  // The hero leads the page.
  await expect(
    page.locator('.vp-doc [data-example-id]').first(),
  ).toHaveAttribute('data-example-id', id)
  await page.evaluate(() => document.fonts.ready)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  // Keep the pointer off every control so no capture records a hover state.
  await page.mouse.move(0, 0)
  return frame
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0)
}

/** Viewport-space union of the given boxes, padded and clamped to the viewport. */
async function unionClip(
  page: Page,
  targets: readonly Locator[],
  padding = 16,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const boxes = await Promise.all(targets.map((target) => target.boundingBox()))
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('The visual project always sets a viewport.')
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const box of boxes) {
    if (!box) throw new Error('Every clipped target must be rendered.')
    left = Math.min(left, box.x)
    top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }
  const x = Math.max(0, Math.floor(left - padding))
  const y = Math.max(0, Math.floor(top - padding))
  return {
    x,
    y,
    width: Math.min(viewport.width, Math.ceil(right + padding)) - x,
    height: Math.min(viewport.height, Math.ceil(bottom + padding)) - y,
  }
}

/*
 * Each overlay hero opens from the keyboard so the capture records the real
 * focus-visible ring where the component moves focus (first field, first
 * item, selected option, or active suggestion). Activation retries until
 * hydration has attached the handlers; static pages render before it.
 */
const overlays = [
  {
    slug: 'dialog',
    id: 'dialog/edit-profile',
    trigger: (preview: Locator) =>
      preview.getByRole('button', { name: 'Edit profile', exact: true }),
    panel: (page: Page) => page.getByRole('dialog', { name: 'Edit profile' }),
    key: 'Enter',
  },
  {
    slug: 'dropdown-menu',
    id: 'dropdown-menu/record-actions',
    trigger: (preview: Locator) =>
      preview.getByRole('button', {
        name: 'Actions for Spring launch brief',
        exact: true,
      }),
    panel: (page: Page) => page.getByRole('menu'),
    key: 'Enter',
  },
  {
    slug: 'select',
    id: 'select/billing-preferences',
    trigger: (preview: Locator) =>
      preview.getByRole('combobox', { name: 'Plan' }),
    panel: (page: Page) => page.getByRole('listbox'),
    key: 'Enter',
  },
  {
    slug: 'combobox',
    id: 'combobox/assignee-search',
    trigger: (preview: Locator) =>
      preview.getByRole('combobox', { name: 'Assignee' }),
    // The popup drops role="listbox" while it has no options to own.
    panel: (page: Page) =>
      page.locator('.assignee-results [data-part="listbox"]'),
    key: 'ArrowDown',
  },
  {
    slug: 'popover',
    id: 'popover/share-settings',
    trigger: (preview: Locator) =>
      preview.getByRole('button', { name: 'Share', exact: true }),
    panel: (page: Page) =>
      page.getByRole('dialog', { name: 'Share “Q3 launch plan”' }),
    key: 'Enter',
  },
] as const

test.describe('docs hero showcase visual baselines', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 1280, height: viewportHeight },
    deviceScaleFactor: 1,
  })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  for (const { slug, id } of heroes) {
    test(`${id} source closed at 390 and 1280px in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        for (const width of heroWidths) {
          await page.setViewportSize({ width, height: viewportHeight })
          for (const mode of modes) {
            const frame = await openHero(page, docs.url, slug, id, mode)
            await expect(exampleSourceToggle(page, id)).toHaveAttribute(
              'aria-expanded',
              'false',
            )
            await expectNoPageOverflow(page)
            await expect(frame).toHaveScreenshot(
              `${slug}-hero-${String(width)}-${mode}.png`,
            )
          }
        }
      } finally {
        await docs.close()
      }
    })
  }

  for (const { slug, id, trigger, panel, key } of overlays) {
    test(`${id} open with its body-portaled panel at 390 and 1280px in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        for (const width of heroWidths) {
          await page.setViewportSize({ width, height: viewportHeight })
          for (const mode of modes) {
            const frame = await openHero(page, docs.url, slug, id, mode)
            const control = trigger(frame.getByTestId('ghost-example-preview'))
            const popup = panel(page)
            // Leave room below the trigger so placement is not edge-forced.
            await control.evaluate((element) => {
              element.scrollIntoView({ block: 'start' })
              window.scrollBy(0, -160)
            })
            await control.focus()
            await expect(async () => {
              if (!(await popup.isVisible())) await control.press(key)
              await expect(popup).toBeVisible({ timeout: 500 })
            }).toPass()
            // The panel is portaled to <body>, outside the docs content tree.
            expect(
              await popup.evaluate(
                (element) => element.closest('.vp-doc') === null,
              ),
            ).toBe(true)
            await expectNoPageOverflow(page)
            await expect(page).toHaveScreenshot(
              `${slug}-hero-open-${String(width)}-${mode}.png`,
              { clip: await unionClip(page, [control, popup]) },
            )
            await page.keyboard.press('Escape')
            await expect(popup).toBeHidden()
          }
        }
      } finally {
        await docs.close()
      }
    })
  }

  /*
   * Source open at the two widths the hero matrix skips: a 320px phone (the
   * narrowest supported width, where the toolbar and fence must wrap or
   * scroll inside the frame) and a 768px tablet (docs sidebar collapsed,
   * widest single-column canvas). The capture stops shortly into the fence so
   * long sources do not dominate the baseline.
   */
  const sourceOpen = [
    { slug: 'button', id: 'button/action-bar', width: 320 },
    { slug: 'tabs', id: 'tabs/workspace', width: 768 },
  ] as const

  for (const { slug, id, width } of sourceOpen) {
    test(`${id} source open at ${String(width)}px in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.setViewportSize({ width, height: viewportHeight })
        for (const mode of modes) {
          const frame = await openHero(page, docs.url, slug, id, mode)
          await openExampleSource(page, id)
          await page.mouse.move(0, 0)
          const source = frame.getByTestId('ghost-example-source')
          await expect(source).toBeVisible()
          await expectNoPageOverflow(page)
          // Park the frame just below the sticky docs nav so the clip holds
          // only the frame, never the overlaid VitePress chrome.
          await frame.evaluate((element) => {
            element.scrollIntoView({ block: 'start' })
            const chrome = [
              ...document.querySelectorAll('.VPNav, .VPLocalNav'),
            ].reduce(
              (bottom, bar) =>
                Math.max(bottom, bar.getBoundingClientRect().bottom),
              0,
            )
            window.scrollBy(0, -(chrome + 8))
          })
          const frameBox = await frame.boundingBox()
          const sourceBox = await source.boundingBox()
          if (!frameBox || !sourceBox) throw new Error('Frame not rendered.')
          const top = Math.floor(frameBox.y)
          await expect(page).toHaveScreenshot(
            `${slug}-hero-source-open-${String(width)}-${mode}.png`,
            {
              clip: {
                x: Math.floor(frameBox.x),
                y: top,
                width: Math.ceil(frameBox.width),
                height: Math.min(
                  viewportHeight - top,
                  Math.ceil(sourceBox.y - top + 280),
                ),
              },
            },
          )
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('table/team-directory at a 480px preview width on a 1280px page in light and dark', async ({
    page,
  }) => {
    const id = 'table/team-directory'
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openHero(page, docs.url, 'table', id, mode)
        await openPreviewWidth(page, id)
        await frame.getByRole('radio', { name: '480' }).check()
        const viewport = frame.getByTestId('ghost-example-viewport')
        await expect
          .poll(() =>
            viewport.evaluate((element) =>
              Math.round(element.getBoundingClientRect().width),
            ),
          )
          .toBe(480)
        await page.mouse.move(0, 0)
        await expectNoPageOverflow(page)
        await expect(
          frame.getByTestId('ghost-example-preview'),
        ).toHaveScreenshot(`table-hero-preview-480-${mode}.png`)
      }
    } finally {
      await docs.close()
    }
  })
})
