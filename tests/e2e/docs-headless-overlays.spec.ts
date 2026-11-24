import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * Headless overlay examples on the docs site (GHO-221). The headless layer
 * positions overlay content but paints nothing, so each example brings its
 * own consumer CSS. Without it the body-portaled panel was transparent,
 * stacked under the example frame, and its text collided with the docs
 * prose. These checks prove every portaled headless overlay example opens
 * as an opaque panel that sits above the page, anchored to its trigger,
 * at a phone and a desktop width in light and dark.
 */

const modes = ['light', 'dark'] as const
type Mode = (typeof modes)[number]
const widths = [390, 1280] as const
const viewportHeight = 900

interface OverlayCase {
  slug: string
  id: string
  trigger: (preview: Locator) => Locator
  panel: (page: Page) => Locator
  open: (trigger: Locator) => Promise<void>
}

const press = (key: string) => async (trigger: Locator) => {
  await trigger.focus()
  await trigger.press(key)
}

const selectBasic: OverlayCase = {
  slug: 'select',
  id: 'select/basic',
  trigger: (preview) => preview.getByRole('combobox', { name: 'Pick a fruit' }),
  panel: (page) => page.getByTestId('select-basic-content'),
  open: press('Enter'),
}

const overlays: readonly OverlayCase[] = [
  selectBasic,
  {
    slug: 'combobox',
    id: 'combobox/basic',
    trigger: (preview) =>
      preview.getByRole('combobox', { name: 'Pick a fruit' }),
    panel: (page) => page.getByTestId('combobox-basic-content'),
    open: press('ArrowDown'),
  },
  {
    slug: 'dropdown-menu',
    id: 'dropdown-menu/basic',
    trigger: (preview) => preview.getByRole('button', { name: 'File actions' }),
    panel: (page) => page.locator('.file-actions-menu'),
    open: press('Enter'),
  },
  {
    slug: 'context-menu',
    id: 'context-menu/basic',
    trigger: (preview) => preview.getByTestId('context-basic-trigger'),
    panel: (page) => page.getByTestId('context-basic-content'),
    open: (trigger) => trigger.click({ button: 'right' }),
  },
  {
    slug: 'menubar',
    id: 'menubar/basic',
    trigger: (preview) =>
      preview.getByRole('menuitem', { name: 'File', exact: true }),
    panel: (page) => page.locator('.app-menubar-menu'),
    open: press('Enter'),
  },
  {
    slug: 'popover',
    id: 'popover/basic',
    trigger: (preview) =>
      preview.getByRole('button', { name: 'Toggle details' }),
    panel: (page) => page.locator('.details-popover'),
    open: press('Enter'),
  },
  {
    slug: 'hover-card',
    id: 'hover-card/basic',
    trigger: (preview) =>
      preview.getByRole('button', { name: 'Contributor profile preview' }),
    panel: (page) => page.locator('.hover-card-basic__panel'),
    open: (trigger) => trigger.focus(),
  },
  {
    slug: 'tooltip',
    id: 'tooltip/basic',
    trigger: (preview) => preview.getByRole('button', { name: 'Archive row' }),
    panel: (page) => page.locator('.archive-tooltip'),
    open: (trigger) => trigger.focus(),
  },
]

/** Alpha of a computed color: `rgb()`, `rgba()`, or a slash-alpha function. */
function alphaOf(color: string): number {
  const slash = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color)
  if (slash) {
    const value = Number(slash[1])
    return slash[2] === '%' ? value / 100 : value
  }
  const rgba = /^rgba\((?:[^,]+,){3}\s*([\d.]+)\)$/.exec(color)
  return rgba ? Number(rgba[1]) : 1
}

async function openExample(
  page: Page,
  url: string,
  { slug, id, trigger, panel, open }: OverlayCase,
  mode: Mode,
): Promise<{ control: Locator; popup: Locator }> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/${slug}.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  await page.evaluate(() => document.fonts.ready)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await expect(frame).toHaveAttribute('data-example-layer', 'headless')
  const control = trigger(frame.getByTestId('ghost-example-preview'))
  const popup = panel(page)
  // Leave room below the trigger so placement is not edge-forced.
  await control.evaluate((element) => {
    element.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -200)
  })
  await page.mouse.move(0, 0)
  // Retry the first activation until hydration has attached the handlers.
  await expect(async () => {
    if (!(await popup.isVisible())) await open(control)
    await expect(popup).toBeVisible({ timeout: 500 })
  }).toPass()
  return { control, popup }
}

test.describe('docs headless overlay examples', () => {
  for (const overlay of overlays) {
    test(`${overlay.id} opens an opaque, layered, anchored panel at 390 and 1280px in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        for (const width of widths) {
          await page.setViewportSize({ width, height: viewportHeight })
          for (const mode of modes) {
            const { control, popup } = await openExample(
              page,
              docs.url,
              overlay,
              mode,
            )
            const surface = await popup.evaluate((element) => {
              const style = getComputedStyle(element)
              const box = element.getBoundingClientRect()
              const hit = document.elementFromPoint(
                box.left + box.width / 2,
                box.top + Math.min(box.height / 2, 12),
              )
              return {
                portaled: element.closest('.vp-doc') === null,
                background: style.backgroundColor,
                zIndex: style.zIndex,
                onTop: hit !== null && element.contains(hit),
                left: box.left,
                right: box.right,
              }
            })
            expect(surface.portaled).toBe(true)
            expect(alphaOf(surface.background)).toBe(1)
            expect(Number(surface.zIndex)).toBeGreaterThan(0)
            expect(surface.onTop).toBe(true)
            expect(surface.left).toBeGreaterThanOrEqual(0)
            expect(surface.right).toBeLessThanOrEqual(width)

            // Anchored: the panel opens next to its trigger.
            const [triggerBox, panelBox] = await Promise.all([
              control.boundingBox(),
              popup.boundingBox(),
            ])
            if (!triggerBox || !panelBox) throw new Error('Both must render.')
            const gap = Math.min(
              Math.abs(panelBox.y - (triggerBox.y + triggerBox.height)),
              Math.abs(triggerBox.y - (panelBox.y + panelBox.height)),
            )
            if (overlay.id !== 'context-menu/basic') {
              expect(gap).toBeLessThanOrEqual(16)
            }

            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth,
              ),
            ).toBeLessThanOrEqual(0)
          }
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('select/basic options show distinct highlighted, selected and disabled states', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const { popup } = await openExample(page, docs.url, selectBasic, mode)
        const selected = popup.getByRole('option', { name: 'Banana' })
        const disabled = popup.getByRole('option', { name: /Cherry/ })
        const plain = popup.getByRole('option', { name: 'Apple' })
        // Keyboard opening focuses the selected option; move the highlight.
        await expect(selected).toBeFocused()
        await page.keyboard.press('ArrowDown')
        const highlighted = popup.getByRole('option', { name: 'Orange' })
        // The disabled option is skipped.
        await expect(highlighted).toBeFocused()
        await expect(disabled).toHaveAttribute('aria-disabled', 'true')
        await expect(selected).toHaveAttribute('aria-selected', 'true')

        const look = (option: Locator) =>
          option.evaluate((element) => {
            const style = getComputedStyle(element)
            const mark = getComputedStyle(element, '::before')
            return {
              background: style.backgroundColor,
              color: style.color,
              weight: style.fontWeight,
              mark: mark.visibility,
            }
          })
        const [plainLook, selectedLook, disabledLook, highlightedLook] =
          await Promise.all([
            look(plain),
            look(selected),
            look(disabled),
            look(highlighted),
          ])
        expect(selectedLook.mark).toBe('visible')
        expect(plainLook.mark).toBe('hidden')
        expect(selectedLook.weight).not.toBe(plainLook.weight)
        expect(highlightedLook.background).not.toBe(plainLook.background)
        expect(highlightedLook.color).not.toBe(plainLook.color)
        expect(disabledLook.color).not.toBe(plainLook.color)
        await page.keyboard.press('Escape')
        await expect(popup).toBeHidden()
      }
    } finally {
      await docs.close()
    }
  })

  test('select/basic keeps a visible highlight and disabled color under forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const { popup } = await openExample(page, docs.url, selectBasic, 'light')
      const highlighted = popup.getByRole('option', { name: 'Banana' })
      await expect(highlighted).toBeFocused()
      const [focusLook, appleLook, disabledLook] = await Promise.all(
        [
          highlighted,
          popup.getByRole('option', { name: 'Apple' }),
          popup.getByRole('option', { name: /Cherry/ }),
        ].map((option) =>
          option.evaluate((element) => {
            const style = getComputedStyle(element)
            return { background: style.backgroundColor, color: style.color }
          }),
        ),
      )
      expect(focusLook?.background).not.toBe(appleLook?.background)
      expect(disabledLook?.color).not.toBe(appleLook?.color)
    } finally {
      await docs.close()
    }
  })
})

test.describe(
  'docs headless Select open-state visual baselines',
  { tag: '@visual' },
  () => {
    test.use({
      viewport: { width: 1280, height: viewportHeight },
      deviceScaleFactor: 1,
    })

    test('select/basic open at 390 and 1280px in light and dark', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        for (const width of widths) {
          await page.setViewportSize({ width, height: viewportHeight })
          for (const mode of modes) {
            const { control, popup } = await openExample(
              page,
              docs.url,
              selectBasic,
              mode,
            )
            const [a, b] = await Promise.all([
              control.boundingBox(),
              popup.boundingBox(),
            ])
            if (!a || !b) throw new Error('Both must render.')
            const x = Math.max(0, Math.floor(Math.min(a.x, b.x) - 16))
            const y = Math.max(0, Math.floor(Math.min(a.y, b.y) - 16))
            const right = Math.min(
              width,
              Math.ceil(Math.max(a.x + a.width, b.x + b.width) + 16),
            )
            const bottom = Math.min(
              viewportHeight,
              Math.ceil(Math.max(a.y + a.height, b.y + b.height) + 16),
            )
            await expect(page).toHaveScreenshot(
              `select-basic-open-${String(width)}-${mode}.png`,
              { clip: { x, y, width: right - x, height: bottom - y } },
            )
            await page.keyboard.press('Escape')
            await expect(popup).toBeHidden()
          }
        }
      } finally {
        await docs.close()
      }
    })
  },
)
