import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const showcases = [
  { slug: 'field', id: 'field/profile-settings' },
  { slug: 'textarea', id: 'textarea/release-notes' },
  { slug: 'number-input', id: 'number-input/order-limits' },
  { slug: 'radio-group', id: 'radio-group/deployment-tier' },
  { slug: 'switch', id: 'switch/workspace-security' },
  { slug: 'slider', id: 'slider/audio-mixer' },
  { slug: 'file-upload', id: 'file-upload/asset-submission' },
  { slug: 'inline-alert', id: 'inline-alert/billing-notices' },
  { slug: 'toggle-group', id: 'toggle-group/editor-toolbar' },
  { slug: 'segmented-control', id: 'segmented-control/analytics-period' },
] as const

test.describe('Wave 202a showcases and CSS audit fixes', () => {
  // One test per page and color mode. A single test that loaded all 20
  // page/mode combinations and ran 20 axe scans needed ~30s on a 4-vCPU
  // runner, so it routinely hit the default test timeout and burned two
  // retries (GHO-254). Split tests stay well inside the timeout and let
  // `fullyParallel` spread them across workers and shards.
  for (const { slug, id } of showcases) {
    for (const mode of ['light', 'dark'] as const) {
      test(`${slug} page leads with its themed hero showcase (${id}), passes axe, and fits 390px and 1280px in ${mode} mode`, async ({
        page,
      }) => {
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.addInitScript((appearance) => {
            localStorage.setItem('vitepress-theme-appearance', appearance)
          }, mode)
          await page.setViewportSize({ width: 1280, height: 900 })
          await page.goto(`${docs.url}/components/${slug}.html`)
          await expect(page.locator('html')).toHaveAttribute(
            'data-ghost-mode',
            mode,
          )

          const firstExample = page.locator('.vp-doc [data-example-id]').first()
          await expect(firstExample).toHaveAttribute('data-example-id', id)
          await expect(firstExample).toHaveAttribute(
            'data-example-layer',
            'themed',
          )
          await firstExample.scrollIntoViewIfNeeded()

          const axe = await new AxeBuilder({ page })
            .include(`[data-example-id="${id}"]`)
            .analyze()
          expect(axe.violations, `${id} (${mode})`).toEqual([])

          const desktopOverflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          )
          expect(desktopOverflow, `${id} 1280px overflow`).toBe(false)

          await page.setViewportSize({ width: 390, height: 844 })
          const mobileOverflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          )
          expect(mobileOverflow, `${id} 390px overflow`).toBe(false)
        } finally {
          await docs.close()
        }
      })
    }
  }

  test('solid inline-alert title and message use contrast foreground in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of ['light', 'dark'] as const) {
        await page.addInitScript((appearance) => {
          localStorage.setItem('vitepress-theme-appearance', appearance)
        }, mode)
        await page.goto(`${docs.url}/components/inline-alert.html`)
        const alert = page.locator(
          '[data-example-id="inline-alert/billing-notices"] .ghost-inline-alert[data-variant="solid"]',
        )
        await expect(alert).toBeVisible()
        const colors = await alert.evaluate((el) => {
          const title = el.querySelector('[data-part="title"]')
          const message = el.querySelector('[data-part="message"]')
          return {
            bg: getComputedStyle(el).backgroundColor,
            titleColor: title ? getComputedStyle(title).color : null,
            messageColor: message ? getComputedStyle(message).color : null,
          }
        })
        expect(colors.titleColor).not.toBeNull()
        expect(colors.messageColor).not.toBeNull()
        expect(colors.titleColor).not.toBe(colors.bg)
        expect(colors.messageColor).not.toBe(colors.bg)
        expect(colors.titleColor).toBe(colors.messageColor)
      }
    } finally {
      await docs.close()
    }
  })

  test('number-input sm buttons scale down and focus keeps an outline in forced-colors', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({ forcedColors: 'active' })
      await page.goto(`${docs.url}/components/number-input.html`)
      const frame = page.locator(
        '[data-example-id="number-input/order-limits"]',
      )
      const mdBtn = frame
        .locator(
          '.ghost-number-input:not([data-size]) > .ghost-number-input__button',
        )
        .first()
      const smBtn = frame
        .locator(
          '.ghost-number-input[data-size="sm"] > .ghost-number-input__button',
        )
        .first()

      const mdBox = await mdBtn.boundingBox()
      const smBox = await smBtn.boundingBox()
      if (!mdBox || !smBox) {
        throw new Error('Expected bounding boxes for number-input buttons')
      }
      expect(smBox.height).toBeLessThan(mdBox.height)

      await mdBtn.focus()
      const outlineStyle = await mdBtn.evaluate(
        (el) => getComputedStyle(el).outlineStyle,
      )
      expect(outlineStyle).toBe('solid')
    } finally {
      await docs.close()
    }
  })

  test('radio-group sm items scale hit target smaller than md items', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/radio-group.html`)
      const frame = page.locator(
        '[data-example-id="radio-group/deployment-tier"]',
      )
      const mdItem = frame
        .locator('.ghost-radio-group:not([data-size]) .ghost-radio-group-item')
        .first()
      const smItem = frame
        .locator('.ghost-radio-group[data-size="sm"] .ghost-radio-group-item')
        .first()

      const mdBox = await mdItem.boundingBox()
      const smBox = await smItem.boundingBox()
      if (!mdBox || !smBox) {
        throw new Error('Expected bounding boxes for radio-group items')
      }
      expect(smBox.height).toBeLessThan(mdBox.height)
    } finally {
      await docs.close()
    }
  })
})
