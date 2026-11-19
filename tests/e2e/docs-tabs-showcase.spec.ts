import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Tabs page leads with the `tabs/workspace` showcase. These checks cover
 * what a screenshot cannot prove on its own: every documented key with real
 * focus and ARIA state, mirrored arrows in Arabic, long German labels at phone
 * width, hover/focus/disabled feedback without layout shifts, forced colors,
 * light and dark surfaces, and no docs prose styles in example text.
 */
const id = 'tabs/workspace'
const modes = ['light', 'dark'] as const

async function openPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/tabs.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  return {
    preview,
    root: preview.locator('section.workspace'),
    list: preview.getByRole('tablist'),
    tab: (name: string) => preview.getByRole('tab', { name }),
    panel: preview.getByRole('tabpanel'),
    language: (name: string) =>
      preview.getByRole('button', { name, exact: true }),
  }
}

// Retry the first selection until hydration has attached the handlers.
async function selectTab(tab: Locator): Promise<void> {
  await expect(async () => {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true', {
      timeout: 500,
    })
  }).toPass()
}

async function chooseLanguage(
  button: Locator,
  root: Locator,
  lang: string,
): Promise<void> {
  await expect(async () => {
    await button.click()
    await expect(root).toHaveAttribute('lang', lang, { timeout: 500 })
  }).toPass()
}

test.describe('docs Tabs workspace showcase', () => {
  test('leads the page and passes axe in light, dark, German, and Arabic', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const results = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(results.violations).toEqual([])
      }

      const frame = await openPage(page, docs.url)
      const { root, language, tab } = partsOf(frame)
      for (const [name, lang] of [
        ['Deutsch', 'de'],
        ['العربية', 'ar'],
      ] as const) {
        await chooseLanguage(language(name), root, lang)
        if (lang === 'ar') await selectTab(tab('الأعضاء'))
        const results = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(results.violations).toEqual([])
      }
    } finally {
      await docs.close()
    }
  })

  test('supports every documented key with real focus and ARIA state', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { tab, panel, list } = partsOf(frame)
      const overview = tab('Overview')
      const members = tab('Members')
      const activity = tab('Activity')
      const billing = tab('Billing')

      await expect(list).toHaveAttribute('aria-orientation', 'horizontal')
      await expect(billing).toBeDisabled()
      await selectTab(members)
      await selectTab(overview)

      // Tab from the language switch enters the strip on the selected tab.
      await frame.getByRole('button', { name: 'العربية' }).focus()
      await page.keyboard.press('Tab')
      await expect(overview).toBeFocused()

      await page.keyboard.press('ArrowRight')
      await expect(members).toBeFocused()
      await expect(members).toHaveAttribute('aria-selected', 'true')
      await expect(overview).toHaveAttribute('aria-selected', 'false')
      await expect(panel).toHaveAttribute(
        'aria-labelledby',
        (await members.getAttribute('id')) ?? '',
      )
      await expect(panel.getByRole('listitem')).toHaveCount(4)

      await page.keyboard.press('ArrowRight')
      await expect(activity).toBeFocused()
      // Billing is disabled, so ArrowRight wraps to the first tab.
      await page.keyboard.press('ArrowRight')
      await expect(overview).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(activity).toBeFocused()
      await page.keyboard.press('Home')
      await expect(overview).toBeFocused()
      await page.keyboard.press('End')
      await expect(activity).toBeFocused()
      await expect(activity).toHaveAttribute('aria-selected', 'true')
      await expect(billing).toHaveAttribute('aria-selected', 'false')

      // Only the selected tab is a tab stop; the next Tab enters the panel.
      await page.keyboard.press('Tab')
      await expect(panel).toBeFocused()
      await expect(panel.locator('time')).toHaveCount(3)
      await page.keyboard.press('Shift+Tab')
      await expect(activity).toBeFocused()

      // A disabled tab ignores pointer activation.
      await billing.click({ force: true })
      await expect(activity).toHaveAttribute('aria-selected', 'true')
    } finally {
      await docs.close()
    }
  })

  test('mirrors arrow keys in Arabic and keeps the selection', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { root, language, tab, list } = partsOf(frame)
      await chooseLanguage(language('العربية'), root, 'ar')
      await expect(root).toHaveAttribute('dir', 'rtl')
      await expect(list).toHaveAttribute('aria-label', 'أقسام مساحة العمل')

      const overview = tab('نظرة عامة')
      const members = tab('الأعضاء')
      await expect(overview).toHaveAttribute('aria-selected', 'true')

      // The first tab sits at the inline start, which is the right edge.
      const first = await overview.boundingBox()
      const second = await members.boundingBox()
      if (!first || !second) throw new Error('unmeasured tabs')
      expect(first.x).toBeGreaterThan(second.x)

      await overview.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(members).toBeFocused()
      await expect(members).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('ArrowRight')
      await expect(overview).toBeFocused()
      await page.keyboard.press('End')
      await expect(tab('سجل النشاط')).toBeFocused()
    } finally {
      await docs.close()
    }
  })

  for (const width of [320, 390]) {
    test(`long German labels wrap without overflow at ${String(width)}px`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.setViewportSize({ width, height: 800 })
        const frame = await openPage(page, docs.url)
        const { root, language, list, tab, panel } = partsOf(frame)
        await chooseLanguage(language('Deutsch'), root, 'de')
        await expect(tab('Mitglieder und Berechtigungen')).toBeVisible()

        const strip = await list.boundingBox()
        if (!strip) throw new Error('unmeasured strip')
        for (const element of await list.getByRole('tab').all()) {
          const box = await element.boundingBox()
          if (!box) throw new Error('unmeasured tab')
          expect(box.x).toBeGreaterThanOrEqual(strip.x - 0.5)
          expect(box.x + box.width).toBeLessThanOrEqual(
            strip.x + strip.width + 0.5,
          )
        }

        // The panel always sits below the whole strip.
        const panelBox = await panel.boundingBox()
        if (!panelBox) throw new Error('unmeasured panel')
        expect(panelBox.y).toBeGreaterThanOrEqual(strip.y + strip.height)

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(0)
        expect(
          await root.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        ).toBeLessThanOrEqual(0)
      } finally {
        await docs.close()
      }
    })
  }

  test('hover, focus, and disabled feedback keep the strip still', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { tab, list, panel } = partsOf(frame)
      const overview = tab('Overview')
      const members = tab('Members')
      const billing = tab('Billing')
      await selectTab(overview)
      await page.mouse.move(0, 0)

      const background = (locator: Locator) =>
        locator.evaluate((element) => getComputedStyle(element).backgroundColor)
      const stripBox = await list.boundingBox()
      const idle = await members.boundingBox()
      const idleBackground = await background(members)
      expect(await background(overview)).not.toBe(idleBackground)

      await members.hover()
      await expect.poll(() => background(members)).not.toBe(idleBackground)
      expect(await members.boundingBox()).toEqual(idle)
      expect(await list.boundingBox()).toEqual(stripBox)

      // Disabled tabs are dimmed and do not react to hover.
      const disabledBackground = await background(billing)
      await billing.hover({ force: true })
      expect(await background(billing)).toBe(disabledBackground)
      const disabled = await billing.evaluate((element) => {
        const computed = getComputedStyle(element)
        return { opacity: Number(computed.opacity), cursor: computed.cursor }
      })
      expect(disabled.opacity).toBeLessThan(1)
      expect(disabled.cursor).toBe('not-allowed')

      // Keyboard focus draws an outline ring that fits inside the frame.
      await overview.focus()
      await page.keyboard.press('ArrowRight')
      await expect(members).toBeFocused()
      expect(await members.boundingBox()).toEqual(idle)
      const ring = await members.evaluate((element) => {
        const computed = getComputedStyle(element)
        const width = Number.parseFloat(computed.outlineWidth)
        const offset = Number.parseFloat(computed.outlineOffset)
        const clip = element.closest('.ghost-example')
        if (!clip) return { width, fits: false }
        const box = element.getBoundingClientRect()
        const bounds = clip.getBoundingClientRect()
        const room = width + offset
        return {
          width,
          style: computed.outlineStyle,
          fits:
            box.left - room >= bounds.left &&
            box.right + room <= bounds.right &&
            box.top - room >= bounds.top,
        }
      })
      expect(ring.width).toBeGreaterThan(0)
      expect(ring.fits).toBe(true)

      // The focusable panel uses the same ring instead of the UA default.
      await page.keyboard.press('Tab')
      await expect(panel).toBeFocused()
      expect(
        await panel.evaluate((element) => {
          const computed = getComputedStyle(element)
          return Number.parseFloat(computed.outlineWidth) > 0
        }),
      ).toBe(true)
    } finally {
      await docs.close()
    }
  })

  test('selected tab stays legible in forced colors', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({ forcedColors: 'active' })
      const frame = await openPage(page, docs.url)
      const { tab } = partsOf(frame)
      const overview = tab('Overview')
      await selectTab(overview)
      const colors = await overview.evaluate((element) => {
        const computed = getComputedStyle(element)
        return { fg: computed.color, bg: computed.backgroundColor }
      })
      expect(colors.bg).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/)
      expect(colors.fg).not.toBe(colors.bg)
    } finally {
      await docs.close()
    }
  })

  test('surfaces follow light and dark and text keeps its own type', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, string> = {}
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        const { panel } = partsOf(frame)
        surfaces[mode] = await panel.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        )
        expect(surfaces[mode]).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/)
      }
      expect(surfaces.light).not.toBe(surfaces.dark)

      const frame = await openPage(page, docs.url)
      const { preview, tab, panel } = partsOf(frame)
      // Docs prose margins and heading rules stay out of the example text.
      const heading = await preview
        .getByRole('heading', { level: 2 })
        .evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            padding: computed.paddingBlockStart,
          }
        })
      expect(heading).toEqual({ margin: '0px', border: '0px', padding: '0px' })
      const stats = await panel
        .locator('dd')
        .first()
        .evaluate((element) => {
          return getComputedStyle(element).marginInlineStart
        })
      expect(stats).toBe('0px')

      await selectTab(tab('Members'))
      const list = await panel.getByRole('list').evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          margin: computed.marginBlockStart,
          padding: computed.paddingInlineStart,
          style: computed.listStyleType,
        }
      })
      expect(list).toEqual({ margin: '0px', padding: '0px', style: 'none' })
      const second = await panel
        .getByRole('listitem')
        .nth(1)
        .evaluate((element) => getComputedStyle(element).marginBlockStart)
      expect(second).toBe('0px')
    } finally {
      await docs.close()
    }
  })
})
