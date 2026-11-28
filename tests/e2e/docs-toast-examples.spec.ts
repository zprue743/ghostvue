import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { exampleSourceBlock, openExampleSource } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * The Toast guide leads with the themed save-and-retry example (#441). These
 * checks run against the built docs, where the stack portals to <body> and
 * must pick up the docs appearance from <html>, not the example frame.
 */

const LEAD_ID = 'toast/themed'

async function openGuide(page: Page, url: string, mode: 'light' | 'dark') {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/toast.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
}

/** Settle the enter fade so contrast and color reads see the resting toast. */
async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  )
}

test.describe('docs Toast guide', () => {
  test('leads with the themed save-and-retry example and keeps old anchors', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/toast.html#themed-use`)
      await expect(
        page.getByRole('heading', { name: 'Save and retry' }),
      ).toHaveAttribute('id', 'themed-use')
      const lead = page.locator('.vp-doc [data-example-id]').first()
      await expect(lead).toHaveAttribute('data-example-id', LEAD_ID)
      await expect(lead).toHaveAttribute('data-example-layer', 'themed')

      // Deep links from before the reorder still land on a section.
      for (const anchor of [
        'basic-use',
        'stable-ids-and-updates',
        'queue-and-limit',
        'custom-rendering',
        'styling-hooks',
        'motion',
        'advanced-headless-composition',
      ]) {
        await expect(page.locator(`.vp-doc [id="${anchor}"]`)).toHaveCount(1)
      }

      // Headless previews appear only under the Advanced section.
      const headless = page.locator(
        '.vp-doc [data-example-id][data-example-layer="headless"]',
      )
      await expect(headless).toHaveCount(1)
      await expect(headless).toHaveAttribute(
        'data-example-id',
        'toast/queue-overflow',
      )
      const order = await page.evaluate(() => {
        const advanced = document.getElementById(
          'advanced-headless-composition',
        )
        const example = document.querySelector(
          '[data-example-id="toast/queue-overflow"]',
        )
        return advanced && example
          ? advanced.compareDocumentPosition(example) &
              Node.DOCUMENT_POSITION_FOLLOWING
          : 0
      })
      expect(order).toBeTruthy()
    } finally {
      await docs.close()
    }
  })

  for (const mode of ['light', 'dark'] as const) {
    test(`save, retry, and keyboard dismissal work and the portal follows ${mode} mode`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await openGuide(page, docs.url, mode)
        const lead = page.locator(`[data-example-id="${LEAD_ID}"]`)
        const save = lead.getByRole('button', { name: 'Save draft' })
        const sync = lead.getByRole('button', { name: 'Sync files' })
        // The guide's headless example renders a second, inline viewport with
        // the same name, so select the lead's portaled region under <body>.
        const region = page.locator('body > [data-part="viewport"]')
        const polite = page.locator('body > [data-part="announcer-polite"]')
        const toasts = region.locator('[data-ghost-toast]')

        // Retry until hydration attaches the click handler.
        await expect(async () => {
          if ((await toasts.count()) === 0) await save.click()
          await expect(toasts).toHaveCount(1, { timeout: 500 })
        }).toPass()
        await expect(region).toContainText('Draft saved')
        await expect(polite).toHaveText(
          'Draft saved Your changes are stored in this workspace.',
        )

        await sync.click()
        await expect(toasts).toHaveCount(2)
        await expect(polite).toHaveText(
          'Sync failed Three files could not be uploaded.',
        )
        const errorToast = toasts.last()
        await expect(errorToast).toHaveAttribute('data-tone', 'danger')

        // The region is portaled to <body>, outside the example frame, and
        // still resolves the active docs appearance from <html>.
        await expect(region).toHaveCount(1)
        await expect(region).toHaveAttribute('role', 'region')
        await expect(region).toHaveAttribute('aria-label', 'Notifications')
        await settleAnimations(page)
        const colors = await toasts.first().evaluate((element) => {
          const probe = document.createElement('div')
          probe.style.backgroundColor = 'var(--ghost-elevation-3-bg)'
          probe.style.color = 'var(--ghost-surface-fg)'
          document.body.append(probe)
          const expected = getComputedStyle(probe)
          const result = {
            background: getComputedStyle(element).backgroundColor,
            color: getComputedStyle(element).color,
            expectedBackground: expected.backgroundColor,
            expectedColor: expected.color,
          }
          probe.remove()
          return result
        })
        expect(colors.background).toBe(colors.expectedBackground)
        expect(colors.color).toBe(colors.expectedColor)
        const axe = await new AxeBuilder({ page })
          .include('body > [data-part="viewport"]')
          .analyze()
        expect(axe.violations, `toast stack (${mode})`).toEqual([])

        // Retry updates the existing notification in place.
        const before = await errorToast.elementHandle()
        await errorToast.getByRole('button', { name: 'Retry' }).click()
        await expect(toasts).toHaveCount(2)
        await expect(errorToast).toContainText('Still failing')
        await expect(polite).toHaveText(
          'Still failing Attempt 2 failed. Check your connection and try again.',
        )
        expect(
          await errorToast.evaluate(
            (element, previous) => element === previous,
            before,
          ),
        ).toBe(true)

        // Sync files again while the retry toast is visible resets it in
        // place, and the reverted failure text reaches the live region.
        await sync.click()
        await expect(toasts).toHaveCount(2)
        await expect(errorToast).toContainText('Sync failed')
        await expect(errorToast).not.toContainText('Still failing')
        await expect(polite).toHaveText(
          'Sync failed Three files could not be uploaded.',
        )
        expect(
          await errorToast.evaluate(
            (element, previous) => element === previous,
            before,
          ),
        ).toBe(true)
        // Retry counts from the first attempt again.
        await errorToast.getByRole('button', { name: 'Retry' }).click()
        await expect(polite).toHaveText(
          'Still failing Attempt 2 failed. Check your connection and try again.',
        )

        // Keyboard dismissal. On the docs page the portaled stack is last in
        // the tab order, so start inside it: the click left focus on Retry.
        const retry = errorToast.getByRole('button', { name: 'Retry' })
        await expect(retry).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(
          errorToast.getByRole('button', { name: 'Dismiss' }),
        ).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Shift+Tab')
        await expect(
          toasts.first().getByRole('button', { name: 'Dismiss' }),
        ).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(toasts).toHaveCount(1)
        await expect(region).toContainText('Still failing')
        // Focus returns to the control used before entering the stack.
        await expect(sync).toBeFocused()

        // Escape anywhere in the remaining toast dismisses it.
        await retry.focus()
        await page.keyboard.press('Escape')
        await expect(toasts).toHaveCount(0)
        await expect(sync).toBeFocused()
      } finally {
        await docs.close()
      }
    })
  }

  test('the source disclosure and Copy deliver the themed SFC', async ({
    context,
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: docs.url,
      })
      await page.goto(`${docs.url}/components/toast.html`)
      await openExampleSource(page, LEAD_ID)
      const source = exampleSourceBlock(page, LEAD_ID)
      await expect(source).toContainText('@ghostvue/themes')
      await expect(source).toContainText('function retrySync')
      await expect(source).toContainText('announceUpdate: true')
      const copy = page
        .locator(`[data-example-id="${LEAD_ID}"]`)
        .getByRole('button', { name: 'Copy Save and retry source' })
      await copy.click()
      await expect(copy).toHaveAttribute('data-state', 'copied')
      const expected = readFileSync('examples/toast/themed.vue', 'utf8')
      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboard.replaceAll('\r\n', '\n').trim()).toBe(
        expected.replaceAll('\r\n', '\n').trim(),
      )
    } finally {
      await docs.close()
    }
  })
})
