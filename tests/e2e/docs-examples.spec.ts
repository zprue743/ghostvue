import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { docsSidebar } from '../../apps/docs/.vitepress/docs-nav'
import { startStaticServer } from './static-server'

// Every GhostX component page in the sidebar, excluding its spec page.
const componentPages = docsSidebar
  .flatMap((group) => group.items)
  .flatMap(({ text, link }) =>
    text.startsWith('Ghost') &&
    link?.startsWith('/components/') &&
    !link.endsWith('-spec')
      ? [link]
      : [],
  )

function isTransparentColor(value: string): boolean {
  return /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|oklab\(\s*0\s+0\s+0\s*\/\s*0\s*\))$/i.test(
    value,
  )
}

test.describe('docs example previews', () => {
  test('GhostButton themed preview has recipe chrome and highlighted source', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/button.html`)

      const preview = page.locator('[data-example-id="button/themed"]')
      const button = preview
        .getByTestId('ghost-example-preview')
        .locator('.ghost-button')
      await expect(button).toBeVisible()

      const styles = await button.evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          borderTopColor: computed.borderTopColor,
          borderTopWidth: computed.borderTopWidth,
          paddingBlockStart: computed.paddingBlockStart,
          paddingInlineStart: computed.paddingInlineStart,
        }
      })

      expect(Number.parseFloat(styles.paddingBlockStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(styles.paddingInlineStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(styles.borderTopWidth)).toBeGreaterThan(0)
      expect(isTransparentColor(styles.borderTopColor)).toBe(false)

      const source = page.locator(
        '[data-example-id="button/themed"] + div[class*="language-"]',
      )
      await expect(
        source.locator('.vp-code span[style*="--shiki-"]').first(),
      ).toBeVisible()
      await expect(
        preview.getByRole('button', { name: 'Copy Themed source' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('GhostButton headless preview describes the unstyled look', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/button.html`)

      const preview = page.locator('[data-example-id="button/basic"]')
      await expect(preview.getByText('Unstyled. Headless.')).toBeVisible()
      await expect(
        preview.getByTestId('ghost-example-preview').locator('.ghost-button'),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('GhostPopover docs demos open/close interactively and pass Axe', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/popover.html`)

      const basicExample = page.locator('[data-example-id="popover/basic"]')
      await expect(basicExample.getByText('Unstyled. Headless.')).toBeVisible()

      const basicTrigger = basicExample.getByRole('button', {
        name: 'Toggle details',
      })
      await basicTrigger.click()
      const basicDialog = page.getByRole('dialog', { name: 'Toggle details' })
      await expect(basicDialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(basicDialog).toHaveCount(0)

      const themedExample = page.locator('[data-example-id="popover/themed"]')
      const themedTrigger = themedExample.getByRole('button', {
        name: 'Share settings',
      })
      await themedTrigger.click()

      const themedDialog = page.getByRole('dialog', {
        name: 'Share settings',
      })
      await expect(themedDialog).toBeVisible()

      const themedStyles = await themedDialog.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          borderTopWidth: computed.borderTopWidth,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
        }
      })

      expect(isTransparentColor(themedStyles.backgroundColor)).toBe(false)
      expect(Number.parseFloat(themedStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(themedStyles.borderRadius)).toBeGreaterThan(0)
      expect(themedStyles.boxShadow).not.toBe('none')

      const openDocsAxe = await new AxeBuilder({ page }).analyze()
      expect(openDocsAxe.violations).toEqual([])

      await themedDialog.getByRole('button', { name: 'Done' }).click()
      await expect(themedDialog).toHaveCount(0)

      const source = page.locator(
        '[data-example-id="popover/themed"] + div[class*="language-"]',
      )
      await expect(
        source.locator('.vp-code span[style*="--shiki-"]').first(),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('GhostTooltip docs demos show on hover/focus and pass Axe', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/tooltip.html`)

      const basicExample = page.locator('[data-example-id="tooltip/basic"]')
      await expect(basicExample.getByText('Unstyled. Headless.')).toBeVisible()

      const basicTrigger = basicExample.getByRole('button', {
        name: 'Archive row',
      })
      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await basicTrigger.hover()
      const basicTooltip = page
        .getByRole('tooltip')
        .filter({ hasText: 'long-term archive' })
      await expect(basicTooltip).toBeVisible({ timeout: 2000 })

      const themedExample = page.locator('[data-example-id="tooltip/themed"]')
      const themedTrigger = themedExample.getByRole('button', {
        name: 'Hover for glossary',
      })
      await themedTrigger.focus()
      const themedTooltip = page
        .getByRole('tooltip')
        .filter({ hasText: '95th percentile' })
      await expect(themedTooltip).toBeVisible({ timeout: 2000 })

      const themedStyles = await themedTooltip.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          borderTopWidth: computed.borderTopWidth,
          borderRadius: computed.borderRadius,
        }
      })

      expect(isTransparentColor(themedStyles.backgroundColor)).toBe(false)
      expect(Number.parseFloat(themedStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(themedStyles.borderRadius)).toBeGreaterThan(0)
    } finally {
      await docs.close()
    }
  })

  test('every Ghost* component page renders each demo preview', async ({
    page,
  }) => {
    expect(componentPages.length).toBeGreaterThan(0)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      for (const link of componentPages) {
        await page.goto(`${docs.url}${link}`)
        const stages = page.locator('.ghost-example__stage')
        await expect(stages.first()).toBeVisible()
        for (const stage of await stages.all()) {
          await expect(stage.locator(':scope > *').first()).toBeAttached()
        }
      }
      expect(errors).toEqual([])
    } finally {
      await docs.close()
    }
  })

  test('a tab left open across a redeploy reloads instead of rendering empty previews', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/popover`)
      await page.waitForLoadState('networkidle')

      // A redeploy replaces every hashed chunk. Lazy example chunks the old
      // tab never fetched now 404 once; a fresh document load gets them.
      const removed = new Set<string>()
      await page.route('**/assets/chunks/*.js', async (route) => {
        const url = route.request().url()
        if (removed.has(url)) {
          await route.continue()
          return
        }
        removed.add(url)
        await route.fulfill({ status: 404, body: 'Not found' })
      })

      await page
        .locator('.VPSidebar a[href="/components/button"]')
        .first()
        .click()
      await expect(page).toHaveURL(/\/components\/button$/)

      const stages = page.locator('.ghost-example__stage')
      await expect(stages).toHaveCount(6)
      for (const stage of await stages.all()) {
        await expect(stage.locator(':scope > *').first()).toBeAttached()
      }
    } finally {
      await docs.close()
    }
  })
})
