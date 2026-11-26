import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostSegmentedControl'

interface Box {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}

interface SegmentGeometry {
  control: Box
  indicator: Box
  segment: Box
  label: Box
  /** Outline box of the selected segment as painted when it has focus. */
  ring: Box
}

/**
 * Reads the selected segment, sliding indicator, label glyphs, and focus-ring
 * extent in one layout pass. The label rect comes from a Range over the
 * trimmed text so slot whitespace does not skew the centering check.
 */
async function selectedSegmentGeometry(
  group: Locator,
): Promise<SegmentGeometry> {
  return group.evaluate((control): SegmentGeometry => {
    const toBox = (rect: DOMRect): Box => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
    })
    const segment = control.querySelector<HTMLElement>(
      '.ghost-segmented-control-item[data-state="on"]',
    )
    const indicator = control.querySelector('[data-part="indicator"]')
    if (!segment || !indicator) throw new Error('missing selected segment')
    const text = [...segment.childNodes].find(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        (node.textContent ?? '').trim().length > 0,
    )
    const data = text?.textContent ?? ''
    if (!text) throw new Error('missing segment label')
    const start = data.length - data.trimStart().length
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, start + data.trim().length)
    const box = segment.getBoundingClientRect()
    const style = getComputedStyle(segment, null)
    const reach =
      parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth)
    return {
      control: toBox(control.getBoundingClientRect()),
      indicator: toBox(indicator.getBoundingClientRect()),
      segment: toBox(box),
      label: toBox(range.getBoundingClientRect()),
      ring: {
        left: box.left - reach,
        right: box.right + reach,
        top: box.top - reach,
        bottom: box.bottom + reach,
        width: box.width + 2 * reach,
      },
    }
  })
}

/** Asserts the issue #392 geometry contract for the selected segment. */
function expectAlignedSelection(geometry: SegmentGeometry, name: string): void {
  const { control, indicator, segment, label, ring } = geometry
  // The indicator is positioned as an equal 1/n fraction of the track, so it
  // only lines up when every segment really is 1/n wide.
  expect(Math.abs(indicator.left - segment.left), name).toBeLessThanOrEqual(1)
  expect(Math.abs(indicator.width - segment.width), name).toBeLessThanOrEqual(1)
  // The label fits its segment and is centered with even padding.
  const padStart = label.left - segment.left
  const padEnd = segment.right - label.right
  expect(padStart, name).toBeGreaterThan(4)
  expect(padEnd, name).toBeGreaterThan(4)
  expect(Math.abs(padStart - padEnd), name).toBeLessThanOrEqual(1.5)
  // Indicator and focus ring stay inside the control's border box.
  for (const box of [indicator, ring]) {
    expect(box.left, name).toBeGreaterThanOrEqual(control.left - 0.5)
    expect(box.right, name).toBeLessThanOrEqual(control.right + 0.5)
    expect(box.top, name).toBeGreaterThanOrEqual(control.top - 0.5)
    expect(box.bottom, name).toBeLessThanOrEqual(control.bottom + 0.5)
  }
}

test.describe('GhostSegmentedControl', { tag }, () => {
  test('basic example switches views with pointer and keyboard', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/basic`,
      )

      const group = page.getByRole('group', { name: 'Content view' })
      await expect(group).toBeVisible()

      const grid = page.getByRole('button', { name: 'Grid' })
      const list = page.getByRole('button', { name: 'List' })

      await expect(list).toHaveAttribute('aria-pressed', 'true')
      await grid.click()
      await expect(grid).toHaveAttribute('aria-pressed', 'true')
      await expect(list).toHaveAttribute('aria-pressed', 'false')

      await grid.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(list).toBeFocused()

      await list.click()
      await expect(list).toHaveAttribute('aria-pressed', 'true')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('themed example keeps indicator visible when selection changes', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const indicator = page.locator(
        '.ghost-segmented-control [data-part="indicator"]',
      )
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      await page.getByRole('button', { name: 'Day' }).click()
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      const index = await indicator.evaluate((element) =>
        getComputedStyle(element).getPropertyValue(
          '--ghost-segmented-selected-index',
        ),
      )
      expect(index.trim()).toBe('0')
    } finally {
      await playground.close()
    }
  })

  test('themed example aligns indicator and flips roving focus in RTL @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const control = page.locator('.ghost-segmented-control')
      await control.evaluate((el) => {
        el.setAttribute('dir', 'rtl')
      })

      const day = page.getByRole('button', { name: 'Day' })
      const week = page.getByRole('button', { name: 'Week' })
      const indicator = control.locator('[data-part="indicator"]')

      await day.click()
      await expect(day).toHaveAttribute('aria-pressed', 'true')
      await day.focus()

      // In RTL, ArrowLeft moves to the next segment (Week).
      await page.keyboard.press('ArrowLeft')
      await expect(week).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(day).toBeFocused()

      // Indicator must align with the first segment on the inline-start (right)
      // side in RTL. The indicator slides with a CSS transition after the dir
      // flip, so poll for the settled position instead of sampling mid-slide.
      await expect
        .poll(async () => {
          const dayBox = await day.boundingBox()
          const indicatorBox = await indicator.boundingBox()
          if (!dayBox || !indicatorBox) return Number.POSITIVE_INFINITY
          return Math.abs(indicatorBox.x - dayBox.x)
        })
        .toBeLessThan(6)
    } finally {
      await playground.close()
    }
  })

  test('docs home controls keep the indicator on the selected label (#392)', async ({
    page,
  }) => {
    // Reduced motion removes the indicator slide, so each measurement reads
    // the settled position instead of a mid-transition frame.
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/index.html`)

      // Unequal labels ("Apple" vs "PC") used to split a content-sized track
      // evenly, pushing the long label past its segment and the indicator.
      const platform = page.getByRole('group', { name: 'Keycap platform' })
      await platform.scrollIntoViewIfNeeded()
      for (const name of ['PC', 'Apple']) {
        await platform.getByRole('button', { name }).click()
        expectAlignedSelection(await selectedSegmentGeometry(platform), name)
      }
      // Keyboard focus shows a ring that stays inside the control.
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      const apple = platform.getByRole('button', { name: 'Apple' })
      await expect(apple).toBeFocused()
      await expect(apple).toHaveCSS('outline-style', 'solid')
      expectAlignedSelection(await selectedSegmentGeometry(platform), 'focus')

      // Each flagship swaps fonts and spacing, so measure after every switch.
      const themes = page.getByRole('group', { name: 'Flagship theme' })
      await themes.scrollIntoViewIfNeeded()
      for (const name of ['Vibrant', 'Calm', 'Mono', 'Default']) {
        await themes.getByRole('button', { name }).click()
        await expect(themes.getByRole('button', { name })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
        await expect
          .poll(async () => {
            try {
              expectAlignedSelection(
                await selectedSegmentGeometry(themes),
                name,
              )
              return true
            } catch {
              return false
            }
          })
          .toBe(true)
        expectAlignedSelection(await selectedSegmentGeometry(themes), name)
      }
    } finally {
      await docs.close()
    }
  })
})
