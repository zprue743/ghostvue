import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { generatedComponentPageLinks } from '../../apps/docs/.vitepress/docs-nav'
import { startStaticServer } from './static-server'

const componentPages = [...generatedComponentPageLinks]

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
      await expect(preview.locator('.ghost-example__badge')).toHaveText(
        'Headless',
      )
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
      await expect(basicExample.locator('.ghost-example__badge')).toHaveText(
        'Headless',
      )

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

  test('GhostHoverCard docs demos show on hover/focus and pass Axe', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/hover-card.html`)

      const basicExample = page.locator('[data-example-id="hover-card/basic"]')
      await expect(basicExample.locator('.ghost-example__badge')).toHaveText(
        'Headless',
      )

      const basicTrigger = basicExample.getByRole('button', {
        name: 'Contributor profile preview',
      })
      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await basicTrigger.hover()
      const basicDialog = page
        .getByRole('dialog')
        .filter({ hasText: 'headless Vue primitives' })
      await expect(basicDialog).toBeVisible({ timeout: 2000 })
      await expect(basicDialog.getByRole('link')).toBeVisible()

      const themedExample = page.locator(
        '[data-example-id="hover-card/themed"]',
      )
      const themedTrigger = themedExample.getByRole('button', {
        name: 'Design token preview',
      })
      await themedTrigger.focus()
      const themedDialog = page
        .getByRole('dialog')
        .filter({ hasText: 'Elevation-3 surface' })
      await expect(themedDialog).toBeVisible({ timeout: 2000 })

      const themedStyles = await themedDialog.evaluate((el) => {
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

  test('GhostTooltip docs demos show on hover/focus and pass Axe', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/tooltip.html`)

      const basicExample = page.locator('[data-example-id="tooltip/basic"]')
      await expect(basicExample.locator('.ghost-example__badge')).toHaveText(
        'Headless',
      )

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

  test('demo canvas drops .vp-doc prose decoration but keeps recipes and authored styles', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    const previewOf = (id: string) =>
      page
        .locator(`[data-example-id="${id}"]`)
        .getByTestId('ghost-example-preview')

    try {
      await page.goto(`${docs.url}/components/card.html`)
      const cardHeading = previewOf('card/themed').locator('h2')
      await expect(cardHeading).toBeVisible()
      // `.vp-doc h2` adds a divider, 24px top padding, and tight tracking.
      await expect(cardHeading).toHaveCSS('border-top-width', '0px')
      await expect(cardHeading).toHaveCSS('padding-top', '0px')
      await expect(cardHeading).toHaveCSS('letter-spacing', 'normal')

      const inlineCode = previewOf('card/themed').locator('code')
      await expect(inlineCode).toHaveCSS('padding-left', '0px')
      expect(
        isTransparentColor(
          await inlineCode.evaluate(
            (el) => getComputedStyle(el).backgroundColor,
          ),
        ),
      ).toBe(true)

      // Unlayered consumer rules still beat the demo reset layer.
      await page.addStyleTag({
        content: '.custom-heading { border-top: 3px solid rgb(220, 38, 38); }',
      })
      await cardHeading.evaluate((el) => {
        el.classList.add('custom-heading')
      })
      await expect(cardHeading).toHaveCSS('border-top-width', '3px')
      await expect(cardHeading).toHaveCSS(
        'border-top-color',
        'rgb(220, 38, 38)',
      )

      await page.goto(`${docs.url}/components/accordion.html`)
      const accordionHeader = previewOf('accordion/themed')
        .locator('.ghost-accordion-header')
        .first()
      await expect(accordionHeader).toBeVisible()
      await expect(accordionHeader).toHaveCSS('border-top-width', '0px')
      await expect(accordionHeader).toHaveCSS('padding-top', '0px')
      await expect(accordionHeader).toHaveCSS('margin-top', '0px')

      await page.goto(`${docs.url}/components/tabs.html`)
      const tabs = previewOf('tabs/themed')
      const list = tabs.getByRole('tablist')
      const selected = tabs.getByRole('tab', { selected: true })
      const panel = tabs.getByRole('tabpanel')
      await expect(panel).toBeVisible()

      const triggerStyles = await selected.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          borderTopColor: computed.borderTopColor,
          borderTopWidth: computed.borderTopWidth,
          paddingBlockStart: computed.paddingBlockStart,
          paddingInlineStart: computed.paddingInlineStart,
        }
      })
      expect(
        Number.parseFloat(triggerStyles.paddingBlockStart),
      ).toBeGreaterThan(0)
      expect(
        Number.parseFloat(triggerStyles.paddingInlineStart),
      ).toBeGreaterThan(0)
      expect(Number.parseFloat(triggerStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(isTransparentColor(triggerStyles.borderTopColor)).toBe(false)

      const listBox = await list.boundingBox()
      const panelBox = await panel.boundingBox()
      expect(listBox).not.toBeNull()
      expect(panelBox).not.toBeNull()
      if (listBox && panelBox) {
        expect(panelBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height)
        expect(Math.abs(panelBox.x - listBox.x)).toBeLessThan(1)
      }

      // Hover must not shift layout (no border/padding swap on hover).
      const idle = tabs.getByRole('tab', { name: 'Members' })
      await idle.scrollIntoViewIfNeeded()
      const before = await idle.boundingBox()
      await idle.hover()
      expect(await idle.boundingBox()).toEqual(before)

      // Keyboard focus uses the recipe ring, not a docs-host outline.
      await selected.focus()
      await page.keyboard.press('ArrowRight')
      await expect(idle).toBeFocused()
      await expect(idle).toHaveCSS('outline-style', 'solid')

      // The stage scrolls horizontally, so it clips on both axes; the whole
      // ring (outline width + offset) must stay inside its padding box.
      const ringFits = await idle.evaluate((el) => {
        const stage = el.closest('.ghost-example__stage')
        if (!stage) return false
        const computed = getComputedStyle(el)
        const ring =
          Number.parseFloat(computed.outlineWidth) +
          Number.parseFloat(computed.outlineOffset)
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

      await page.goto(`${docs.url}/components/number-input.html`)
      const numberInput = previewOf('number-input/themed').getByRole(
        'spinbutton',
      )
      await expect(numberInput).toBeVisible()
      const inputStyles = await numberInput.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          borderTopColor: computed.borderTopColor,
          borderTopWidth: computed.borderTopWidth,
          paddingInlineStart: computed.paddingInlineStart,
        }
      })
      expect(Number.parseFloat(inputStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(inputStyles.paddingInlineStart)).toBeGreaterThan(
        0,
      )
      expect(isTransparentColor(inputStyles.borderTopColor)).toBe(false)

      // The themed focus treatment is a box-shadow ring with no outline.
      await numberInput.focus()
      await expect(numberInput).toHaveCSS('outline-style', 'none')

      // Themed invalid state still overrides the default border color.
      await previewOf('number-input/themed')
        .locator('.ghost-number-input')
        .evaluate((el) => {
          el.setAttribute('data-state', 'invalid')
        })
      await expect(numberInput).not.toHaveCSS(
        'border-top-color',
        inputStyles.borderTopColor,
      )

      // Headless demos stay unthemed: native control chrome, no recipe.
      await page.goto(`${docs.url}/components/button.html`)
      const headlessButton = previewOf('button/basic').getByRole('button')
      await expect(headlessButton).toBeVisible()
      expect(
        Number.parseFloat(
          await headlessButton.evaluate(
            (el) => getComputedStyle(el).borderTopWidth,
          ),
        ),
      ).toBeGreaterThan(0)
      await expect(headlessButton).not.toHaveAttribute('data-themed')
    } finally {
      await docs.close()
    }
  })

  test('VitePress reset/prose layers stay below theme recipes and unlayered consumer overrides win without !important', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/input.html`)

      const layerOrder = await page.evaluate(() => {
        const rules: string[] = []
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSLayerStatementRule) {
                rules.push(rule.nameList.join(','))
              }
            }
          } catch {
            // Skip cross-origin sheets if any.
          }
        }
        return rules
      })
      expect(layerOrder).toContain(
        'ghostvue-vitepress,ghostvue-demo-reset,ghostvue-theme',
      )

      // Inject ordinary unlayered consumer rules (no !important) and verify they
      // override @layer ghostvue-theme and @layer ghostvue-vitepress on GhostInput.
      const input = page
        .locator('[data-example-id="input/themed"]')
        .getByTestId('ghost-example-preview')
        .locator('.ghost-input')
        .first()
      await expect(input).toBeVisible()

      await page.addStyleTag({
        content:
          '.custom-input { border-color: rgb(220, 38, 38); padding-inline-start: 28px; }',
      })
      await input.evaluate((el) => {
        el.classList.add('custom-input')
      })

      await expect(input).toHaveCSS('border-top-color', 'rgb(220, 38, 38)')
      await expect(input).toHaveCSS('padding-inline-start', '28px')

      // Verify ordinary .custom-link wins over .vp-doc a and @layer ghostvue-theme without !important.
      await page.goto(`${docs.url}/components/link.html`)
      const link = page
        .locator('[data-example-id="link/themed"]')
        .getByTestId('ghost-example-preview')
        .locator('.ghost-link')
        .first()
      await expect(link).toBeVisible()

      await page.addStyleTag({
        content:
          '.custom-link { color: rgb(22, 163, 74); text-decoration: none; }',
      })
      await link.evaluate((el) => {
        el.classList.add('custom-link')
      })

      await expect(link).toHaveCSS('color', 'rgb(22, 163, 74)')
      await expect(link).toHaveCSS('text-decoration-line', 'none')

      // Navigation remains visible and interactive.
      await expect(page.locator('.VPNavBar')).toBeVisible()
      await expect(page.locator('.VPSidebar')).toBeVisible()
    } finally {
      await docs.close()
    }
  })
})
