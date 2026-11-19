import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { exampleSourceToggle } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * DemoPreview framing on the three pilot pages (Button, Input, Dialog): the
 * frame must stay coherent in light and dark, wrap its toolbar on phones
 * without horizontal scroll, keep source secondary, and never clip focus
 * rings or shift layout on hover/focus.
 */
const pilots = [
  { slug: 'button', id: 'button/themed', control: 'Delete' },
  { slug: 'input', id: 'input/themed', control: undefined },
  { slug: 'dialog', id: 'dialog/themed', control: 'Edit profile' },
] as const

const modes = ['light', 'dark'] as const

async function openDocs(
  page: Page,
  url: string,
  mode: (typeof modes)[number],
): Promise<void> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(url)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
}

function isTransparent(color: string): boolean {
  return /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/i.test(color)
}

test.describe('docs DemoPreview frame', () => {
  for (const width of [320, 390] as const) {
    test(`toolbar wraps inside the frame at ${String(width)}px without page overflow`, async ({
      browser,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      })
      const page = await context.newPage()

      try {
        for (const { slug, id } of pilots) {
          await openDocs(page, `${docs.url}/components/${slug}.html`, 'light')
          const frame = page.locator(`[data-example-id="${id}"]`)
          await frame.scrollIntoViewIfNeeded()

          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          )
          expect(overflow).toBeLessThanOrEqual(0)

          const frameBox = await frame.boundingBox()
          const toolbar = frame.getByRole('group', { name: /actions$/ })
          for (const button of await toolbar.getByRole('button').all()) {
            const box = await button.boundingBox()
            expect(box).not.toBeNull()
            expect(frameBox).not.toBeNull()
            if (box && frameBox) {
              expect(box.x).toBeGreaterThanOrEqual(frameBox.x)
              expect(box.x + box.width).toBeLessThanOrEqual(
                frameBox.x + frameBox.width,
              )
            }
          }

          // Phone inset is about 16px on each canvas edge.
          const inset = await frame
            .getByTestId('ghost-example-preview')
            .evaluate((el) =>
              Number.parseFloat(getComputedStyle(el).paddingLeft),
            )
          expect(inset).toBeGreaterThanOrEqual(16)
          expect(inset).toBeLessThanOrEqual(20)
        }
      } finally {
        await context.close()
        await docs.close()
      }
    })
  }

  test('desktop inset is 24-32px and pilots share one frame in light and dark', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      for (const mode of modes) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          colorScheme: mode,
        })
        const page = await context.newPage()
        const frames: Record<string, string>[] = []

        for (const { slug, id } of pilots) {
          await openDocs(page, `${docs.url}/components/${slug}.html`, mode)
          const frame = page.locator(`[data-example-id="${id}"]`)
          await expect(frame).toBeVisible()
          frames.push(
            await frame.evaluate((el) => {
              const figure = getComputedStyle(el)
              const header = getComputedStyle(
                el.querySelector('.ghost-example__header') ?? el,
              )
              const canvas = getComputedStyle(
                el.querySelector('.ghost-example__preview') ?? el,
              )
              return {
                border: `${figure.borderTopWidth} ${figure.borderTopColor}`,
                radius: figure.borderTopLeftRadius,
                shadow: figure.boxShadow,
                header: header.backgroundColor,
                canvas: canvas.backgroundColor,
                inset: canvas.paddingLeft,
              }
            }),
          )
        }

        const [first] = frames
        expect(first).toBeDefined()
        for (const frame of frames) expect(frame).toEqual(first)
        if (first) {
          expect(first.border.startsWith('1px')).toBe(true)
          expect(Number.parseFloat(first.radius)).toBeGreaterThan(0)
          expect(first.shadow).not.toBe('none')
          // The header band is distinct from the canvas in both modes.
          expect(first.header).not.toBe(first.canvas)
          expect(isTransparent(first.canvas)).toBe(false)
          const inset = Number.parseFloat(first.inset)
          expect(inset).toBeGreaterThanOrEqual(24)
          expect(inset).toBeLessThanOrEqual(32)
        }

        await context.close()
      }
    } finally {
      await docs.close()
    }
  })

  test('source is secondary, controls do not shift on hover or focus, and focus rings are not clipped', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      for (const { slug, id, control } of pilots) {
        await openDocs(page, `${docs.url}/components/${slug}.html`, 'light')
        const frame = page.locator(`[data-example-id="${id}"]`)
        const toggle = exampleSourceToggle(page, id)
        const region = frame.getByTestId('ghost-example-source')

        // Collapsed by default, and the canvas comes before the source.
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(region).toBeHidden()
        const order = await frame.evaluate((el) => {
          const preview = el.querySelector(
            '[data-testid="ghost-example-preview"]',
          )
          const source = el.querySelector(
            '[data-testid="ghost-example-source"]',
          )
          return Boolean(
            preview &&
            source &&
            preview.compareDocumentPosition(source) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          )
        })
        expect(order).toBe(true)

        // Hover and keyboard focus on toolbar buttons keep their geometry.
        for (const button of await frame
          .getByRole('group', { name: /actions$/ })
          .getByRole('button')
          .all()) {
          await button.scrollIntoViewIfNeeded()
          const idle = await button.boundingBox()
          await button.hover()
          expect(await button.boundingBox()).toEqual(idle)
          await button.focus()
          expect(await button.boundingBox()).toEqual(idle)
        }

        if (!control) continue
        const target = frame
          .getByTestId('ghost-example-preview')
          .getByRole('button', { name: control })
        await target.scrollIntoViewIfNeeded()
        const frameBefore = await frame.boundingBox()
        const before = await target.boundingBox()
        await target.hover()
        expect(await target.boundingBox()).toEqual(before)
        await page.mouse.move(0, 0)
        await target.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await expect(target).toBeFocused()
        expect(await target.boundingBox()).toEqual(before)
        expect(await frame.boundingBox()).toEqual(frameBefore)

        // The ring (outline or box-shadow spread) stays inside the stage's
        // clip box, which scrolls horizontally and therefore clips.
        const ringFits = await target.evaluate((el) => {
          const stage = el.closest('.ghost-example__stage')
          if (!stage) return false
          const computed = getComputedStyle(el)
          const outline =
            computed.outlineStyle === 'none'
              ? 0
              : Number.parseFloat(computed.outlineWidth) +
                Number.parseFloat(computed.outlineOffset)
          const spreads = [...computed.boxShadow.matchAll(/(-?[\d.]+)px/g)]
            .map((match) => Number.parseFloat(match[1] ?? '0'))
            .filter((value) => value >= 0)
          const ring = Math.max(outline, ...spreads, 0)
          const box = el.getBoundingClientRect()
          const clip = stage.getBoundingClientRect()
          return (
            box.top - ring >= clip.top &&
            box.left - ring >= clip.left &&
            box.bottom + ring <= clip.bottom &&
            box.right + ring <= clip.right
          )
        })
        expect(ringFits).toBe(true)
      }

      const axe = await new AxeBuilder({ page })
        .include('[data-example-id="dialog/themed"]')
        .analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await docs.close()
    }
  })

  test('the canvas never sits empty when a demo chunk fails to load', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/popover.html`)
      await page.waitForLoadState('networkidle')
      // Disable the stale-deploy auto reload so the failure state is visible.
      await page.evaluate(() => {
        sessionStorage.setItem(
          'ghost-docs-stale-chunk-reload-at',
          String(Date.now() + 60_000),
        )
      })
      // Fail every example chunk the client has not fetched yet.
      await page.route('**/assets/chunks/*.js', (route) =>
        route.fulfill({ status: 404, body: 'Not found' }),
      )

      await page
        .locator('.VPSidebar a[href="/components/button"]')
        .first()
        .click()
      await expect(page).toHaveURL(/\/components\/button$/)

      const stages = page.locator('.ghost-example__stage')
      await expect(stages.first()).toBeVisible()
      for (const stage of await stages.all()) {
        // Each canvas shows either the demo or an explained status.
        await expect(stage.locator(':scope > *').first()).toBeAttached()
      }
      const failure = page
        .locator('.ghost-example__status[data-state="error"]')
        .first()
      await expect(failure).toContainText('This example could not load')
      await expect(
        failure.getByRole('button', { name: 'Reload page' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })
})
