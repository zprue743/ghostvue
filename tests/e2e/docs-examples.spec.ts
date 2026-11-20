import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { generatedComponentPageLinks } from '../../apps/docs/.vitepress/docs-nav'
import {
  examplePreviewWidthToggle,
  exampleSourceBlock,
  exampleSourceToggle,
  openExampleSource,
  openPreviewWidth,
  scriptClipboardWrites,
} from './docs-example-source'
import { startStaticServer } from './static-server'

const componentPages = [...generatedComponentPageLinks]

function isTransparentColor(value: string): boolean {
  return /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|oklab\(\s*0\s+0\s+0\s*\/\s*0\s*\))$/i.test(
    value,
  )
}

/** Rendered inline size of an example's preview-width query container. */
async function viewportWidth(example: Locator): Promise<number> {
  return example
    .getByTestId('ghost-example-viewport')
    .evaluate((el) => el.getBoundingClientRect().width)
}

/** Canvas content width available to the demo (preview minus its padding). */
async function availableWidth(example: Locator): Promise<number> {
  return example.getByTestId('ghost-example-preview').evaluate((el) => {
    const style = getComputedStyle(el)
    return Math.floor(
      el.clientWidth -
        Number.parseFloat(style.paddingInlineStart) -
        Number.parseFloat(style.paddingInlineEnd),
    )
  })
}

async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
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

      await openExampleSource(page, 'button/themed')
      const source = exampleSourceBlock(page, 'button/themed')
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

      await openExampleSource(page, 'popover/themed')
      const source = exampleSourceBlock(page, 'popover/themed')
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
        name: '@ghostvue/themes',
      })
      await themedTrigger.focus()
      const themedDialog = page
        .getByRole('dialog')
        .filter({ hasText: 'Semantic DTCG tokens' })
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
        name: 'Explain Latency p95',
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
      await expect(stages).toHaveCount(7)
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

  test('themed demos follow the site appearance and headless Accordion stays unthemed', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    /** Relative luminance (0..1) of a computed sRGB `rgb()`/`rgba()` color. */
    const luminance = (color: string): number => {
      const channels = /rgba?\(([^)]+)\)/.exec(color)?.[1]?.split(',') ?? []
      const [r = 0, g = 0, b = 0] = channels
        .slice(0, 3)
        .map((value) => Number.parseFloat(value) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    try {
      for (const mode of ['light', 'dark'] as const) {
        const context = await browser.newContext({ colorScheme: mode })
        // The docs restore script reads this before first paint.
        await context.addInitScript((appearance) => {
          localStorage.setItem('vitepress-theme-appearance', appearance)
        }, mode)
        const page = await context.newPage()
        const previewOf = (id: string) =>
          page
            .locator(`[data-example-id="${id}"]`)
            .getByTestId('ghost-example-preview')

        await page.goto(`${docs.url}/components/accordion.html`)
        await expect(page.locator('html')).toHaveAttribute(
          'data-ghost-mode',
          mode,
        )

        // Inline themed text follows the page mode (no forced-light island).
        const trigger = previewOf('accordion/themed')
          .getByRole('button', { name: 'Inventory holds' })
          .first()
        await expect(trigger).toBeVisible()
        const triggerInk = luminance(
          await trigger.evaluate((el) => getComputedStyle(el).color),
        )
        if (mode === 'dark') expect(triggerInk).toBeGreaterThan(0.5)
        else expect(triggerInk).toBeLessThan(0.2)

        // default.css is loaded site-wide; the headless accordion's behavior
        // hooks must not opt it into the stacked theme layout.
        const headlessRoot =
          previewOf('accordion/basic').locator('.ghost-accordion')
        await expect(headlessRoot).toHaveAttribute('data-ghost-accordion', '')
        await expect(headlessRoot).toHaveCSS('display', 'block')
        await expect(
          previewOf('accordion/basic').locator('.ghost-accordion-item').first(),
        ).toHaveCSS('display', 'block')
        await expect(
          previewOf('accordion/themed').locator('.ghost-accordion'),
        ).toHaveCSS('display', 'flex')

        // Portaled content and its inline trigger share the page mode.
        await page.goto(`${docs.url}/components/tooltip.html`)
        await previewOf('tooltip/themed')
          .getByRole('button', { name: 'Explain Latency p95' })
          .focus()
        const tooltip = page
          .getByRole('tooltip')
          .filter({ hasText: '95th percentile' })
        await expect(tooltip).toBeVisible({ timeout: 2000 })
        const tooltipSurface = luminance(
          await tooltip.evaluate((el) => getComputedStyle(el).backgroundColor),
        )
        if (mode === 'dark') expect(tooltipSurface).toBeLessThan(0.1)
        else expect(tooltipSurface).toBeGreaterThan(0.8)

        for (const [slug, id] of [
          ['collapsible', 'collapsible/themed'],
          ['empty-state', 'empty-state/themed'],
          ['hover-card', 'hover-card/themed'],
          ['scroll-area', 'scroll-area/themed'],
        ] as const) {
          await page.goto(`${docs.url}/components/${slug}.html`)
          const preview = previewOf(id)
          await expect(preview.locator(':scope > *').first()).toBeAttached()
          // No local mode/theme host: tokens come from <html>, like portals.
          await expect(
            preview.locator('[data-ghost-mode], .ghost-theme'),
          ).toHaveCount(0)
        }

        await context.close()
      }
    } finally {
      await docs.close()
    }
  })

  test('docs canvas and the playground examples route render the same control chrome and token host', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    const playground = await startStaticServer('apps/playground/dist')

    // Headless native controls, themed recipes, a themed calendar (its
    // recipe was once missing from default.css), and themed overlay triggers
    // the example leaves unstyled. VitePress strips native chrome from every
    // control, so the docs canvas must restore it to match a consumer app.
    const parityExamples = [
      'button/basic',
      'checkbox/indeterminate',
      'switch/basic',
      'number-input/themed',
      'radio-group/themed',
      'calendar/themed',
      'tooltip/themed',
    ] as const
    const properties = [
      'appearance',
      'background-color',
      'border-top-style',
      'border-top-width',
      'border-top-left-radius',
      'font-size',
      'font-weight',
      'padding-top',
      'padding-left',
      'margin-top',
    ]

    interface Chrome {
      tag: string
      values: Record<string, string>
    }
    const chromeIn = (stage: Locator): Promise<Chrome[]> =>
      stage.evaluate((element, names) => {
        return [
          ...element.querySelectorAll(
            'button, input:not([type="hidden"]), select, textarea',
          ),
        ].map((control) => {
          const style = getComputedStyle(control)
          return {
            tag: `${control.tagName.toLowerCase()}${control.getAttribute('type') ? `[${String(control.getAttribute('type'))}]` : ''}`,
            values: Object.fromEntries(
              names.map((name) => [name, style.getPropertyValue(name)]),
            ),
          }
        })
      }, properties)

    try {
      for (const mode of ['light', 'dark'] as const) {
        const context = await browser.newContext({ colorScheme: mode })
        await context.addInitScript((appearance) => {
          localStorage.setItem('vitepress-theme-appearance', appearance)
        }, mode)
        const docsPage = await context.newPage()
        const hostPage = await context.newPage()

        for (const id of parityExamples) {
          const component = id.split('/')[0] ?? ''
          await docsPage.goto(`${docs.url}/components/${component}.html`)
          const docsStage = docsPage.locator(
            `[data-example-id="${id}"] .ghost-example__stage`,
          )
          await expect(docsStage.locator(':scope > *').first()).toBeAttached()

          await hostPage.goto(
            `${playground.url}/examples.html?id=${encodeURIComponent(id)}&mode=${mode}`,
          )
          const hostStage = hostPage.getByTestId('ghost-example-stage')
          await expect(hostStage.locator(':scope > *').first()).toBeAttached()

          // Same token host: calm flagship, density left unset, no global
          // recipe activation on either surface.
          for (const page of [docsPage, hostPage]) {
            const html = page.locator('html')
            await expect(html).toHaveAttribute('data-ghost-theme', 'calm')
            await expect(html).toHaveAttribute('data-ghost-mode', mode)
            await expect(html).not.toHaveAttribute('data-ghost-density')
            await expect(html).not.toHaveClass(/\bghost-theme\b/)
          }

          const docsChrome = await chromeIn(docsStage)
          const hostChrome = await chromeIn(hostStage)
          expect(docsChrome.length, `${id} renders controls`).toBeGreaterThan(0)
          expect(docsChrome, `${id} control chrome (${mode})`).toEqual(
            hostChrome,
          )
          // Native or recipe chrome, never VitePress's bare-text reset.
          for (const control of docsChrome) {
            if (
              control.tag === 'input[radio]' ||
              control.tag === 'input[checkbox]'
            ) {
              continue
            }
            const painted =
              Number.parseFloat(control.values['border-top-width'] ?? '0') >
                0 ||
              !isTransparentColor(control.values['background-color'] ?? '')
            expect(painted, `${id} ${control.tag} keeps chrome`).toBe(true)
          }
        }

        await context.close()
      }
    } finally {
      await docs.close()
      await playground.close()
    }
  })

  test('each example owns one collapsible highlighted source that never resets the demo', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/input.html`)

      // Every host holds exactly one highlighted SFC in its own source slot;
      // nothing is left as a sibling fence next to the card.
      const counts = await page.evaluate(() =>
        [...document.querySelectorAll('figure[data-example-id]')].map(
          (figure) => ({
            owned: figure.querySelectorAll(
              '[data-testid="ghost-example-source"] > div[class*="language-"]',
            ).length,
            sibling:
              figure.nextElementSibling?.matches('div[class*="language-"]') ??
              false,
          }),
        ),
      )
      expect(counts.length).toBeGreaterThan(0)
      for (const entry of counts) {
        expect(entry).toEqual({ owned: 1, sibling: false })
      }

      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)
      const toggle = exampleSourceToggle(page, id)
      const region = example.getByTestId('ghost-example-source')
      const copy = example.getByRole('button', { name: /^Copy .* source$/ })

      // Collapsed by default; the toggle names and controls the region.
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(region).toBeHidden()
      await expect(region).toHaveAttribute('role', 'region')
      expect(await toggle.getAttribute('aria-controls')).toBe(
        await region.getAttribute('id'),
      )

      // Put the live demo into a user-driven state and tag the node so a
      // remount would be detectable.
      const field = example
        .getByTestId('ghost-example-preview')
        .getByRole('textbox')
        .nth(1)
      await field.fill('typed before toggling')
      await field.evaluate((element) => {
        element.setAttribute('data-probe', 'original-node')
      })

      const copyBox = await copy.boundingBox()
      await openExampleSource(page, id)
      await expect(region).toBeVisible()
      await expect(
        exampleSourceBlock(page, id)
          .locator('.vp-code span[style*="--shiki-"]')
          .first(),
      ).toBeVisible()
      // The toggle label is constant, so the header controls do not move.
      expect(await copy.boundingBox()).toEqual(copyBox)

      // Keyboard: the native button toggles with Enter and Space and keeps focus.
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toBeFocused()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(region).toBeHidden()
      await page.keyboard.press('Space')
      await expect(toggle).toBeFocused()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')

      // Demo state survives both transitions: same node, same value.
      await expect(field).toHaveValue('typed before toggling')
      await expect(field).toHaveAttribute('data-probe', 'original-node')

      // Collapsing one example leaves its neighbours' sources alone.
      await expect(exampleSourceToggle(page, 'input/basic')).toHaveAttribute(
        'aria-expanded',
        'false',
      )

      const axe = await new AxeBuilder({ page })
        .include(`[data-example-id="${id}"]`)
        .analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await docs.close()
    }
  })
  test('Copy writes the original source and announces success through a live status', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    const context = await browser.newContext()
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()

    try {
      await page.goto(`${docs.url}/components/input.html`)
      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)
      const copy = example.getByRole('button', { name: 'Copy Themed source' })
      const status = example.getByRole('status')

      // The live region exists (empty) before the first message.
      await expect(status).toHaveCount(1)
      await expect(status).toHaveText('')

      await expect(async () => {
        await copy.click()
        await expect(status).toHaveText('Copied', { timeout: 500 })
      }).toPass()
      // The label never changes, so the toolbar does not reflow.
      await expect(copy).toHaveText('Copy')

      // The unhighlighted SFC from disk, not the Shiki markup.
      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboard).toBe(readFileSync(`examples/${id}.vue`, 'utf8'))

      // Copying never opens the source.
      await expect(exampleSourceToggle(page, id)).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    } finally {
      await context.close()
      await docs.close()
    }
  })

  test('Copy without a clipboard reports failure and selects the source for manual copy', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      // Insecure origins and locked-down embeds have no Clipboard API.
      await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'clipboard', {
          configurable: true,
          get: () => undefined,
        })
      })
      await page.goto(`${docs.url}/components/input.html`)
      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)
      const copy = example.getByRole('button', { name: 'Copy Themed source' })
      const status = example.getByRole('status')

      // Keyboard only: Enter on the native button.
      await expect(async () => {
        await copy.focus()
        await page.keyboard.press('Enter')
        await expect(status).toContainText('Copy failed', { timeout: 500 })
      }).toPass()
      await expect(copy).toBeFocused()
      await expect(exampleSourceToggle(page, id)).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      await expect(example.getByTestId('ghost-example-source')).toBeVisible()
      const selected = await page.evaluate(() =>
        String(window.getSelection() ?? ''),
      )
      expect(selected).toContain('<template>')
      expect(selected).toContain('</script>')

      // The failure message stays legible inside the frame on a phone.
      await page.setViewportSize({ width: 320, height: 800 })
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
    } finally {
      await docs.close()
    }
  })

  test('a denied clipboard write reports failure, and a slow earlier copy never overrides the latest result', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      /*
       * The Clipboard API exists but rejects (permission denied), which is a
       * different path from a missing API. Each call's outcome is scripted:
       * the first write is denied after a delay, the second succeeds at
       * once, so the first rejection settles after the second success.
       */
      await scriptClipboardWrites(page, [
        { delay: 0, ok: false },
        { delay: 400, ok: false },
        { delay: 0, ok: true },
      ])
      await page.goto(`${docs.url}/components/input.html`)
      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)
      const copy = example.getByRole('button', { name: 'Copy Themed source' })
      const status = example.getByRole('status')

      // A denied write fails visibly and keeps focus on Copy.
      await expect(async () => {
        await copy.focus()
        await page.keyboard.press('Enter')
        await expect(status).toContainText('Copy failed', { timeout: 500 })
      }).toPass()
      await expect(copy).toBeFocused()
      await expect(example.getByTestId('ghost-example-source')).toBeVisible()

      // Second press starts a slow denied write; the third succeeds first.
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await expect(status).toHaveText('Copied')
      // Outlast the slow rejection: the latest result must stay on screen.
      await page.waitForTimeout(600)
      await expect(status).toHaveText('Copied')
      await expect(copy).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  test('Preview width presets and range are keyboard operable, capped, and keep demo state and focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${docs.url}/components/input.html`)
      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)
      const toggle = examplePreviewWidthToggle(page, id)
      const band = example.getByTestId('ghost-example-width')
      const report = example.getByTestId('ghost-example-width-report')

      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(band).toBeHidden()
      expect(await toggle.getAttribute('aria-controls')).toBe(
        await band.getAttribute('id'),
      )

      // Named inline-size query container around the demo.
      const container = await example
        .getByTestId('ghost-example-viewport')
        .evaluate((el) => {
          const style = getComputedStyle(el)
          return { name: style.containerName, type: style.containerType }
        })
      expect(container).toEqual({ name: 'ghost-demo', type: 'inline-size' })

      // Put the demo into a user-driven state; a remount would lose both.
      const field = example
        .getByTestId('ghost-example-preview')
        .getByRole('textbox')
        .nth(1)
      await field.fill('typed before resizing')
      await field.evaluate((element) => {
        element.setAttribute('data-probe', 'original-node')
      })

      const available = await availableWidth(example)
      expect(available).toBeGreaterThan(480)
      await openPreviewWidth(page, id)
      await expect(band).toBeVisible()
      await expect(
        band.getByRole('group', { name: 'Preview width' }),
      ).toHaveCount(0)
      const auto = band.getByRole('radio', { name: 'Auto' })
      await expect(auto).toBeChecked()
      await expect(report).toHaveText(`Auto: ${String(available)} px`)

      // Tab into the radio group, then arrows move the selection natively.
      await toggle.focus()
      await page.keyboard.press('Tab')
      await expect(auto).toBeFocused()
      await page.keyboard.press('ArrowRight')
      const small = band.getByRole('radio', { name: '320' })
      await expect(small).toBeFocused()
      await expect(small).toBeChecked()
      await expect(report).toHaveText('320 px')
      expect(await viewportWidth(example)).toBeCloseTo(320, 0)
      await page.keyboard.press('ArrowRight')
      await expect(band.getByRole('radio', { name: '480' })).toBeChecked()
      expect(await viewportWidth(example)).toBeCloseTo(480, 0)

      // 768 does not fit the canvas: capped, and the report says so.
      await page.keyboard.press('ArrowRight')
      const tablet = band.getByRole('radio', { name: '768' })
      await expect(tablet).toBeFocused()
      const capped = Math.min(768, available)
      expect(await viewportWidth(example)).toBeCloseTo(capped, 0)
      if (available < 768) {
        await expect(report).toHaveText(
          `${String(available)} px (capped from 768 px to fit)`,
        )
      }

      // The native range shares the legend's name and reports pixels.
      const range = band.getByRole('slider', { name: 'Preview width' })
      await page.keyboard.press('Tab')
      await expect(range).toBeFocused()
      await page.keyboard.press('Home')
      await expect(range).toHaveAttribute('aria-valuetext', '200 pixels')
      expect(await viewportWidth(example)).toBeCloseTo(200, 0)
      await page.keyboard.press('ArrowRight')
      await expect(report).toHaveText('201 px')
      // No preset matches a custom width.
      await expect(band.getByRole('radio', { checked: true })).toHaveCount(0)
      await page.keyboard.press('End')
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        `${String(available)} pixels`,
      )
      await expect(range).toBeFocused()

      await auto.check()
      await expect(report).toHaveText(`Auto: ${String(available)} px`)
      await band.getByRole('radio', { name: '320' }).check()

      // Collapsing keeps the chosen width, so the demo does not jump.
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toBeFocused()
      await expect(band).toBeHidden()
      expect(await viewportWidth(example)).toBeCloseTo(320, 0)

      // Demo state survives every width change: same node, same value.
      await expect(field).toHaveValue('typed before resizing')
      await expect(field).toHaveAttribute('data-probe', 'original-node')

      await openPreviewWidth(page, id)
      const axe = await new AxeBuilder({ page })
        .include(`[data-example-id="${id}"]`)
        .analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await docs.close()
    }
  })

  test('collapsing a region that holds focus moves focus to its toggle', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/input.html`)
      const id = 'input/themed'
      const example = page.locator(`[data-example-id="${id}"]`)

      // A pointer click in Safari does not focus the button, so focus can
      // still sit inside the region; a synthetic click reproduces that.
      await openExampleSource(page, id)
      const sourceToggle = exampleSourceToggle(page, id)
      // The scrollable code block is a Tab stop (VitePress sets tabindex=0).
      const inner = exampleSourceBlock(page, id).locator('pre')
      await inner.focus()
      await expect(inner).toBeFocused()
      await sourceToggle.dispatchEvent('click')
      await expect(sourceToggle).toHaveAttribute('aria-expanded', 'false')
      await expect(sourceToggle).toBeFocused()

      await openPreviewWidth(page, id)
      const widthToggle = examplePreviewWidthToggle(page, id)
      const radio = example.getByRole('radio', { name: '480' })
      await radio.focus()
      await widthToggle.dispatchEvent('click')
      await expect(widthToggle).toHaveAttribute('aria-expanded', 'false')
      await expect(widthToggle).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  for (const width of [320, 390] as const) {
    test(`Preview width at a ${String(width)}px phone caps every preset without page overflow`, async ({
      browser,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      })
      const page = await context.newPage()

      try {
        await page.goto(`${docs.url}/components/input.html`)
        const id = 'input/themed'
        const example = page.locator(`[data-example-id="${id}"]`)
        await example.scrollIntoViewIfNeeded()
        await openPreviewWidth(page, id)
        const available = await availableWidth(example)
        const frame = await example.boundingBox()

        for (const name of ['320', '480', '768']) {
          await example.getByRole('radio', { name }).check()
          expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
          expect(await viewportWidth(example)).toBeLessThanOrEqual(
            available + 0.5,
          )
          if (Number(name) > available) {
            await expect(
              example.getByTestId('ghost-example-width-report'),
            ).toHaveText(
              `${String(available)} px (capped from ${name} px to fit)`,
            )
          }
        }

        // The band itself wraps inside the frame.
        for (const control of await example
          .getByTestId('ghost-example-width')
          .locator('input, legend, [data-testid="ghost-example-width-report"]')
          .all()) {
          const box = await control.boundingBox()
          if (box && frame) {
            expect(box.x).toBeGreaterThanOrEqual(frame.x)
            expect(box.x + box.width).toBeLessThanOrEqual(
              frame.x + frame.width + 0.5,
            )
          }
        }
      } finally {
        await context.close()
        await docs.close()
      }
    })
  }

  test('portal=false popovers keep the canvas as their containing block at every preview width', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`${docs.url}/components/select.html`)
      const id = 'select/form'
      const example = page.locator(`[data-example-id="${id}"]`)
      await openPreviewWidth(page, id)
      const trigger = example.getByRole('combobox', { name: 'Email cadence' })

      for (const name of ['Auto', '320', '480', '768']) {
        await example.getByRole('radio', { name }).check()
        await trigger.click()
        const listbox = page.getByRole('listbox')
        await expect(listbox).toBeVisible()

        const layout = await listbox.evaluate((el) => {
          const content = el.closest('.ghost-select-content') ?? el
          const stage = el.closest('.ghost-example__stage')
          const options = [...el.querySelectorAll('[role="option"]')]
          // Every option is hit-testable: nothing clips the popover.
          const visible = options.every((option) => {
            const rect = option.getBoundingClientRect()
            const hit = document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            )
            return option === hit || option.contains(hit)
          })
          return {
            position: getComputedStyle(content).position,
            // A `contain`, transform, or `position` on the query container
            // (or anything between it and the canvas) would change this.
            containingBlock:
              content instanceof HTMLElement
                ? (content.offsetParent?.className ?? null)
                : null,
            stageScrolls: stage
              ? stage.scrollHeight > stage.clientHeight + 1
              : true,
            visible,
          }
        })
        expect(layout).toEqual({
          position: 'absolute',
          containingBlock: 'ghost-example__preview',
          stageScrolls: false,
          visible: true,
        })

        await page.keyboard.press('Escape')
        await expect(listbox).toBeHidden()
      }
    } finally {
      await docs.close()
    }
  })
})
