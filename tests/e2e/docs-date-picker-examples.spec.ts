import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { exampleSourceBlock, openExampleSource } from './docs-example-source'
import { startStaticServer } from './static-server'

/*
 * DatePicker examples on the docs site (GHO-220). The headless layer
 * positions the calendar surface but paints nothing, and the headless
 * examples shipped no consumer CSS: the body-portaled surface was
 * transparent, sat under the example frame on top of the docs prose, and
 * the month grid ran together ("SunMonTue…", "1234567"). These checks prove
 * every DatePicker example opens a contained, opaque, layered surface
 * anchored to its input, with a real 7-column month grid, at a phone and a
 * desktop width in light and dark, and that focus enters and returns.
 */

const modes = ['light', 'dark'] as const
type Mode = (typeof modes)[number]
const widths = [390, 1280] as const
const viewportHeight = 900

interface PickerCase {
  id: string
  layer: 'headless' | 'themed'
  /** Opens any wrapper (an outer dialog) before the picker trigger shows. */
  prepare?: (page: Page, preview: Locator) => Promise<void>
}

const cases: readonly PickerCase[] = [
  { id: 'date-picker/basic', layer: 'headless' },
  { id: 'date-picker/range', layer: 'headless' },
  { id: 'date-picker/controlled', layer: 'themed' },
  { id: 'date-picker/validation', layer: 'themed' },
  { id: 'date-picker/custom-format', layer: 'themed' },
  { id: 'date-picker/rtl', layer: 'themed' },
  {
    id: 'date-picker/nested-dialog',
    layer: 'themed',
    prepare: async (page, preview) => {
      const open = preview.getByRole('button', { name: 'Schedule reminder' })
      await expect(async () => {
        if (!(await page.getByRole('dialog').isVisible())) await open.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 500 })
      }).toPass()
    },
  },
  { id: 'date-picker/themed', layer: 'themed' },
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

async function openPicker(
  page: Page,
  url: string,
  { id, layer, prepare }: PickerCase,
  mode: Mode,
): Promise<{ trigger: Locator; anchor: Locator; popup: Locator }> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/date-picker.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  await page.evaluate(() => document.fonts.ready)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await expect(frame).toHaveAttribute('data-example-layer', layer)
  const preview = frame.getByTestId('ghost-example-preview')
  // Leave room below the example so placement is not edge-forced.
  await preview.evaluate((element) => {
    element.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -120)
  })
  await page.mouse.move(0, 0)
  if (prepare) await prepare(page, preview)
  // Nested pickers render inside the portaled outer dialog, not the preview.
  const scope = prepare ? page.getByRole('dialog') : preview
  const trigger = scope.locator('[data-part="trigger"]')
  const anchor = scope.locator('[data-part="input"]').first()
  const popup = page.locator('.ghost-date-picker-content')
  // Retry the first activation until hydration has attached the handlers.
  await expect(async () => {
    if (!(await popup.isVisible())) await trigger.click()
    await expect(popup).toBeVisible({ timeout: 500 })
  }).toPass()
  return { trigger, anchor, popup }
}

test.describe('docs DatePicker examples', () => {
  for (const picker of cases) {
    test(`${picker.id} opens a contained, layered, anchored calendar at 390 and 1280px in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        for (const width of widths) {
          await page.setViewportSize({ width, height: viewportHeight })
          for (const mode of modes) {
            const { trigger, anchor, popup } = await openPicker(
              page,
              docs.url,
              picker,
              mode,
            )

            // Focus moves into the surface (the roving date cell).
            await expect(popup.locator(':focus')).toHaveCount(1)
            await expect(popup.locator('[data-part="cell"]:focus')).toHaveCount(
              1,
            )

            const surface = await popup.evaluate((element) => {
              const style = getComputedStyle(element)
              const box = element.getBoundingClientRect()
              const probe = (x: number, y: number) => {
                const hit = document.elementFromPoint(x, y)
                return hit !== null && element.contains(hit)
              }
              return {
                portaled: element.closest('.vp-doc') === null,
                background: style.backgroundColor,
                borderWidth: parseFloat(style.borderTopWidth),
                zIndex: style.zIndex,
                onTop:
                  probe(box.left + box.width / 2, box.top + 12) &&
                  probe(box.left + box.width / 2, box.bottom - 12),
                left: box.left,
                right: box.right,
              }
            })
            expect(surface.portaled).toBe(true)
            expect(alphaOf(surface.background)).toBe(1)
            expect(surface.borderWidth).toBeGreaterThan(0)
            expect(Number(surface.zIndex)).toBeGreaterThan(0)
            expect(surface.onTop).toBe(true)
            expect(surface.left).toBeGreaterThanOrEqual(0)
            expect(surface.right).toBeLessThanOrEqual(width)

            // Anchored: the surface opens next to the input.
            const [anchorBox, panelBox] = await Promise.all([
              anchor.boundingBox(),
              popup.boundingBox(),
            ])
            if (!anchorBox || !panelBox) throw new Error('Both must render.')
            const gap = Math.min(
              Math.abs(panelBox.y - (anchorBox.y + anchorBox.height)),
              Math.abs(anchorBox.y - (panelBox.y + panelBox.height)),
            )
            expect(gap).toBeLessThanOrEqual(16)

            // A real month grid: 7 columns shared by weekday header and weeks.
            const grid = await popup
              .locator('[role="grid"]')
              .evaluate((element) => {
                const rows = [...element.querySelectorAll('[role="row"]')]
                const lefts = rows.map((row) =>
                  [...row.children].map((cell) =>
                    Math.round(cell.getBoundingClientRect().left),
                  ),
                )
                const tops = rows.map((row) =>
                  [...row.children].map((cell) =>
                    Math.round(cell.getBoundingClientRect().top),
                  ),
                )
                return { lefts, tops }
              })
            const [header, ...weeks] = grid.lefts
            expect(header).toHaveLength(7)
            expect(new Set(header).size).toBe(7)
            for (const week of weeks) expect(week).toEqual(header)
            // Each row is one line: its cells share a top edge.
            for (const tops of grid.tops) expect(new Set(tops).size).toBe(1)

            // Header controls sit on one row (shared vertical center).
            const headerCenters = await popup
              .locator('[data-part="header"]')
              .evaluate((element) =>
                [...element.children].map((child) => {
                  const box = child.getBoundingClientRect()
                  return box.top + box.height / 2
                }),
              )
            expect(headerCenters.length).toBeGreaterThanOrEqual(3)
            expect(
              Math.max(...headerCenters) - Math.min(...headerCenters),
            ).toBeLessThanOrEqual(2)

            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth,
              ),
            ).toBeLessThanOrEqual(0)

            // Escape closes and returns focus to the trigger.
            await page.keyboard.press('Escape')
            await expect(popup).toBeHidden()
            await expect(trigger).toBeFocused()
          }
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('the lead trip picker commits a range by keyboard and returns focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(docs.url + '/components/date-picker.html#themed-use')
      await expect(
        page.getByRole('heading', { name: 'Book a trip' }),
      ).toHaveAttribute('id', 'themed-use')
      const lead = page.locator('.vp-doc [data-example-id]').first()
      await expect(lead).toHaveAttribute(
        'data-example-id',
        'date-picker/themed',
      )
      await expect(lead).toHaveAttribute('data-example-layer', 'themed')
      const trigger = lead.getByRole('button', { name: 'Choose trip dates' })
      const dialog = page.getByRole('dialog', { name: 'Choose dates' })
      const departure = lead.getByRole('textbox', { name: 'Departure' })
      const returnDate = lead.getByRole('textbox', { name: 'Return' })
      const closed = await new AxeBuilder({ page })
        .include('[data-example-id="date-picker/themed"]')
        .analyze()
      expect(closed.violations).toEqual([])
      await expect(async () => {
        if (!(await dialog.isVisible())) await trigger.press('Enter')
        await expect(dialog).toBeVisible({ timeout: 500 })
      }).toPass()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const opened = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .analyze()
      expect(opened.violations).toEqual([])
      await expect(
        dialog.locator('[data-ghost-calendar-date="2026-12-04"]'),
      ).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(
        dialog.locator('[data-ghost-calendar-date="2026-12-05"]'),
      ).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(dialog.getByRole('status')).toHaveText('Choose an end date')
      await expect(departure).toHaveValue('2026-12-04')
      await page.keyboard.press('ArrowRight')
      await expect(
        dialog.locator('[data-ghost-calendar-date="2026-12-06"]'),
      ).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(dialog).toBeHidden()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(trigger).toBeFocused()
      await expect(departure).toHaveValue('2026-12-05')
      await expect(returnDate).toHaveValue('2026-12-06')
    } finally {
      await docs.close()
    }
  })

  test('the trip booking source disclosure and Copy deliver the themed SFC', async ({
    context,
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: docs.url,
      })
      await page.goto(docs.url + '/components/date-picker.html')
      await openExampleSource(page, 'date-picker/themed')
      const source = exampleSourceBlock(page, 'date-picker/themed')
      await expect(source).toContainText('@ghostvue/themes')
      await expect(source).toContainText('Choose trip dates')
      const copy = page
        .locator('[data-example-id="date-picker/themed"]')
        .getByRole('button', { name: 'Copy Book a trip source' })
      await copy.click()
      await expect(copy).toHaveAttribute('data-state', 'copied')
      const expected = readFileSync('examples/date-picker/themed.vue', 'utf8')
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

  test('date-picker/basic closes on an outside click', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const basic = cases[0]
      if (!basic) throw new Error('Missing basic case.')
      const { popup } = await openPicker(page, docs.url, basic, 'light')
      const box = await popup.boundingBox()
      if (!box) throw new Error('Popup must render.')
      await page.mouse.click(
        Math.min(box.x + box.width + 40, 1200),
        box.y + box.height - 8,
      )
      await expect(popup).toBeHidden()
    } finally {
      await docs.close()
    }
  })

  test('date-picker/range headless cells show distinct today, selected, range and outside-month states', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const range = cases[1]
      if (!range) throw new Error('Missing range case.')
      for (const mode of modes) {
        const { popup } = await openPicker(page, docs.url, range, mode)
        await page.mouse.move(0, 0)
        const look = (date: string) =>
          popup
            .locator(`[data-ghost-calendar-date="${date}"]`)
            .evaluate((element) => {
              const style = getComputedStyle(element)
              return {
                background: style.backgroundColor,
                border: style.borderTopColor,
                color: style.color,
              }
            })
        const [plain, today, start, middle, outside] = await Promise.all([
          look('2026-11-10'),
          look('2026-11-17'),
          look('2026-11-20'),
          look('2026-11-21'),
          look('2026-12-01'),
        ])
        expect(today.border).not.toBe(plain.border)
        expect(start.background).not.toBe(plain.background)
        expect(start.color).not.toBe(plain.color)
        expect(middle.background).not.toBe(plain.background)
        expect(middle.background).not.toBe(start.background)
        expect(outside.color).not.toBe(plain.color)
        await page.keyboard.press('Escape')
        await expect(popup).toBeHidden()
      }
    } finally {
      await docs.close()
    }
  })

  test('date-picker/range headless keeps selected and today visible under forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const range = cases[1]
      if (!range) throw new Error('Missing range case.')
      const { popup } = await openPicker(page, docs.url, range, 'light')
      await page.mouse.move(0, 0)
      const look = (date: string) =>
        popup
          .locator(`[data-ghost-calendar-date="${date}"]`)
          .evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              background: style.backgroundColor,
              border: style.borderTopColor,
            }
          })
      const [plain, today, start] = await Promise.all([
        look('2026-11-10'),
        look('2026-11-17'),
        look('2026-11-20'),
      ])
      expect(start.background).not.toBe(plain.background)
      expect(today.border).not.toBe(plain.border)
    } finally {
      await docs.close()
    }
  })
})

test.describe(
  'docs DatePicker open-state visual baselines',
  { tag: '@visual' },
  () => {
    test.use({
      viewport: { width: 1280, height: viewportHeight },
      deviceScaleFactor: 1,
    })

    for (const picker of cases.filter((item) =>
      ['date-picker/basic', 'date-picker/range', 'date-picker/themed'].includes(
        item.id,
      ),
    )) {
      const slug = picker.id.replaceAll('/', '-')
      test(`${picker.id} open at 390 and 1280px in light and dark`, async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          for (const width of widths) {
            await page.setViewportSize({ width, height: viewportHeight })
            for (const mode of modes) {
              const { trigger, anchor, popup } = await openPicker(
                page,
                docs.url,
                picker,
                mode,
              )
              // Opening focuses the same roving cell every time, so its focus
              // ring is part of the baseline.
              const boxes = await Promise.all([
                anchor.boundingBox(),
                trigger.boundingBox(),
                popup.boundingBox(),
              ])
              const present = boxes.filter((box) => box !== null)
              if (present.length !== 3) throw new Error('All must render.')
              const x = Math.max(
                0,
                Math.floor(Math.min(...present.map((box) => box.x)) - 16),
              )
              const y = Math.max(
                0,
                Math.floor(Math.min(...present.map((box) => box.y)) - 16),
              )
              const right = Math.min(
                width,
                Math.ceil(
                  Math.max(...present.map((box) => box.x + box.width)) + 16,
                ),
              )
              const bottom = Math.min(
                viewportHeight,
                Math.ceil(
                  Math.max(...present.map((box) => box.y + box.height)) + 16,
                ),
              )
              await expect(page).toHaveScreenshot(
                `${slug}-open-${String(width)}-${mode}.png`,
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
    }
  },
)
