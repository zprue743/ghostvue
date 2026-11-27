import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Combobox page leads with the `combobox/assignee-search` showcase. These
 * checks cover what a screenshot cannot prove on its own: every documented
 * key with real focus on the input and `aria-activedescendant` state, each
 * async state (loading, results, empty, error, selected), an out-of-order
 * response that must not win, the body-portaled list in light and dark,
 * phone widths, stable hover and focus geometry, and no docs prose styles in
 * example text.
 */
const id = 'combobox/assignee-search'
const modes = ['light', 'dark'] as const

async function openPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/combobox.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(page: Page, frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  const input = preview.getByRole('combobox', { name: 'Assignee' })
  // The popup drops role="listbox" while it has no options to own.
  const listbox = page.locator('.assignee-results [data-part="listbox"]')
  return {
    preview,
    input,
    listbox,
    options: listbox.getByRole('option'),
    option: (name: string) =>
      listbox.getByRole('option').filter({ hasText: name }),
    names: listbox.locator('.assignee-option__name'),
    empty: page.locator('.assignee-results [data-part="empty"]'),
    status: preview.locator('.assign__status'),
    offline: preview.getByRole('switch', { name: 'Simulate offline' }),
  }
}

// Retry the first press until hydration has attached the handlers.
async function openList(input: Locator): Promise<void> {
  await input.focus()
  await expect(async () => {
    if ((await input.getAttribute('aria-expanded')) === 'true') return
    await input.press('ArrowDown')
    await expect(input).toHaveAttribute('aria-expanded', 'true', {
      timeout: 500,
    })
  }).toPass()
}

async function activeOptionText(input: Locator): Promise<string> {
  const active = await input.getAttribute('aria-activedescendant')
  if (!active) return ''
  return input
    .page()
    .locator(`[id="${active}"] .assignee-option__name`)
    .innerText()
}

test.describe('docs Combobox assignee search showcase', () => {
  test('leads the page and passes axe in every state in light and dark', async ({
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
        const closed = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(closed.violations).toEqual([])

        const { input, listbox, names, empty, offline } = partsOf(page, frame)
        await openList(input)
        await expect(names).toHaveText([
          'Maya Chen',
          'Marcus Reed',
          'Hannah Moore',
        ])
        const results = await new AxeBuilder({ page })
          .include('.assignee-results')
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(results.violations).toEqual([])

        await input.fill('zzz')
        await expect(empty).toContainText('No one matches “zzz”')
        await expect(listbox).not.toHaveAttribute('aria-busy', 'true')
        const none = await new AxeBuilder({ page })
          .include('.assignee-results')
          .analyze()
        expect(none.violations).toEqual([])

        await page.keyboard.press('Escape')
        await offline.click()
        await input.fill('maya')
        await expect(empty).toContainText('Couldn’t reach the directory')
        const failed = await new AxeBuilder({ page })
          .include('.assignee-results')
          .analyze()
        expect(failed.violations).toEqual([])
        await page.keyboard.press('Escape')
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
      const { input, listbox, preview, status } = partsOf(page, frame)

      await openList(input)
      await expect(input).toBeFocused()
      await expect(input).toHaveAttribute(
        'aria-controls',
        (await listbox.getAttribute('id')) ?? '',
      )
      expect(await activeOptionText(input)).toBe('Maya Chen')
      await page.keyboard.press('ArrowDown')
      expect(await activeOptionText(input)).toBe('Marcus Reed')
      await page.keyboard.press('End')
      expect(await activeOptionText(input)).toBe('Hannah Moore')
      // Arrows wrap at the ends.
      await page.keyboard.press('ArrowDown')
      expect(await activeOptionText(input)).toBe('Maya Chen')
      await page.keyboard.press('ArrowUp')
      expect(await activeOptionText(input)).toBe('Hannah Moore')
      await page.keyboard.press('Home')
      expect(await activeOptionText(input)).toBe('Maya Chen')
      await expect(input).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await expect(input).not.toHaveAttribute('aria-activedescendant')
      await expect(input).toBeFocused()

      // Type, wait for results, choose with Enter.
      await page.keyboard.type('jon')
      await expect(input).toHaveAttribute('aria-expanded', 'true')
      await expect(
        page.locator('.assignee-results .assignee-option__name'),
      ).toHaveText(['Jonas Weber'])
      await page.keyboard.press('ArrowDown')
      expect(await activeOptionText(input)).toBe('Jonas Weber')
      await page.keyboard.press('Enter')
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await expect(input).toHaveValue('Jonas Weber')
      await expect(input).toBeFocused()
      await expect(status).toHaveText('Assigned to Jonas Weber.')
      await expect(preview.locator('.assign__person-name')).toHaveText(
        'Jonas Weber',
      )

      // Reopening marks the assignee as selected.
      await page.keyboard.press('ArrowDown')
      await expect(
        page.locator('.assignee-results [role="option"][aria-selected="true"]'),
      ).toContainText('Jonas Weber')
      await page.keyboard.press('Escape')

      // Tab leaves the widget for Unassign; Unassign returns focus here.
      await page.keyboard.press('Tab')
      const unassign = preview.getByRole('button', {
        name: 'Unassign Jonas Weber',
      })
      await expect(unassign).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(input).toBeFocused()
      await expect(input).toHaveValue('')
      await expect(status).toHaveText('Issue is unassigned.')
      await expect(preview.locator('.assign__unassigned')).toHaveText(
        'Unassigned',
      )
    } finally {
      await docs.close()
    }
  })

  test('ignores a slower, older response and shows loading until the latest answers', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { input, listbox, names } = partsOf(page, frame)
      await openList(input)

      // "m" answers in 440 ms and "ma" in 280 ms, so "m" resolves last.
      await page.keyboard.type('ma')
      await expect(listbox).toHaveAttribute('aria-busy', 'true')
      await expect(page.locator('.assignee-results__loading')).toBeVisible()
      await expect(listbox).not.toHaveAttribute('aria-busy', 'true')
      const forMa = await names.allInnerTexts()
      expect(forMa).toContain('Maya Chen')
      expect(forMa).not.toContain('Daniel Kim')

      // Give the stale "m" response time to land; it must not win.
      await page.waitForTimeout(600)
      await expect(names).toHaveText(forMa)
      await expect(input).toHaveValue('ma')
      await expect(listbox).not.toHaveAttribute('aria-busy', 'true')
    } finally {
      await docs.close()
    }
  })

  for (const width of [320, 768] as const) {
    test(`keeps the card and list inside a ${String(width)}px viewport`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        const viewport = { width, height: 720 }
        await page.setViewportSize(viewport)
        const frame = await openPage(page, docs.url)
        const { input, listbox, preview } = partsOf(page, frame)
        await openList(input)
        await expect(listbox.getByRole('option')).toHaveCount(3)
        const box = await page.locator('.assignee-results').boundingBox()
        if (!box) throw new Error('unmeasured list')
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(0)

        // Search and the assignee panel stack on narrow previews.
        const field = await input.boundingBox()
        const panel = await preview.locator('.assign__current').boundingBox()
        if (!field || !panel) throw new Error('unmeasured layout')
        if (width === 320) {
          expect(panel.y).toBeGreaterThan(field.y + field.height)
        }
        await page.keyboard.press('Escape')
        await expect(input).toBeFocused()
      } finally {
        await docs.close()
      }
    })
  }

  test('the body-portaled list follows light and dark tokens', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, string> = {}
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        const { input } = partsOf(page, frame)
        await openList(input)
        const content = page.locator('.assignee-results')
        expect(
          await content.evaluate(
            (element) => element.closest('.ghost-example') === null,
          ),
        ).toBe(true)
        const bg = await content.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        )
        expect(bg).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/)
        surfaces[mode] = bg
        await page.keyboard.press('Escape')
      }
      expect(surfaces.light).not.toBe(surfaces.dark)
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and example text keeps its own type', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { input, option, preview } = partsOf(page, frame)

      const idle = await input.boundingBox()
      await input.hover()
      expect(await input.boundingBox()).toEqual(idle)
      await openList(input)
      expect(await input.boundingBox()).toEqual(idle)

      // Keyboard focus uses the token ring (not the browser outline), and it
      // stays clear of the preview's clipping edges.
      await page.keyboard.press('Escape')
      await expect(input).toBeFocused()
      const ring = await input.evaluate((element) => {
        const computed = getComputedStyle(element)
        const clip = element.closest('.ghost-example')
        const box = element.getBoundingClientRect()
        const bounds = clip?.getBoundingClientRect()
        const room =
          Number.parseFloat(computed.outlineWidth) +
          Number.parseFloat(computed.outlineOffset)
        return {
          style: computed.outlineStyle,
          fits:
            bounds !== undefined &&
            box.left - room >= bounds.left &&
            box.right + room <= bounds.right,
        }
      })
      expect(ring).toEqual({ style: 'solid', fits: true })
      expect(await input.boundingBox()).toEqual(idle)

      // Docs prose margins and heading styles stay out of the card text.
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
      const statusMargin = await preview
        .locator('.assign__status')
        .evaluate((element) => getComputedStyle(element).marginBlockStart)
      expect(statusMargin).toBe('0px')

      // Pointer and keyboard highlight only recolor options.
      await page.keyboard.press('ArrowDown')
      const marcus = option('Marcus Reed')
      await marcus.evaluate(async (element) => {
        // The opening surface scales independently of option highlight.
        const surface = element.closest('.assignee-results')
        await Promise.all(
          surface?.getAnimations().map((animation) => animation.finished) ?? [],
        )
      })
      const before = await marcus.boundingBox()
      await marcus.hover()
      await expect(marcus).toHaveAttribute('data-highlighted', '')
      expect(await marcus.boundingBox()).toEqual(before)
      await page.keyboard.press('End')
      expect(await marcus.boundingBox()).toEqual(before)
    } finally {
      await docs.close()
    }
  })
})
