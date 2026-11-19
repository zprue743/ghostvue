import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Select page leads with the `select/billing-preferences` showcase. These
 * checks cover what a screenshot cannot prove on its own: every documented
 * key with real focus, the disabled option, required validation, the long
 * label ellipsis, themed body-portal lists in light and dark, the narrow
 * stack, stable hover and focus geometry, and no docs prose styles in the
 * example text.
 */
const id = 'select/billing-preferences'
const modes = ['light', 'dark'] as const

async function openSelectPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/select.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(page: Page, frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  return {
    preview,
    plan: preview.getByRole('combobox', { name: 'Plan' }),
    cycle: preview.getByRole('combobox', { name: 'Billing cycle' }),
    currency: preview.getByRole('combobox', { name: /Invoice currency/ }),
    delivery: preview.getByRole('combobox', { name: 'Invoice delivery' }),
    taxRegion: preview.getByRole('combobox', { name: 'Tax region' }),
    listbox: page.getByRole('listbox'),
    save: preview.getByRole('button', { name: 'Save preferences' }),
    status: preview.getByRole('status'),
  }
}

// Retry the first activation until hydration has attached the handlers.
async function openList(
  trigger: Locator,
  listbox: Locator,
  activate: (trigger: Locator) => Promise<void> = (target) => target.click(),
): Promise<void> {
  await expect(async () => {
    await activate(trigger)
    await expect(listbox).toBeVisible({ timeout: 500 })
  }).toPass()
}

test.describe('docs Select billing preferences showcase', () => {
  test('leads the page and passes axe closed and open in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openSelectPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const closed = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(closed.violations).toEqual([])

        const { plan, listbox } = partsOf(page, frame)
        await openList(plan, listbox)
        const open = await new AxeBuilder({ page })
          .include('.ghost-select-content')
          .analyze()
        expect(open.violations).toEqual([])
        await page.keyboard.press('Escape')
        await expect(listbox).toBeHidden()
      }
    } finally {
      await docs.close()
    }
  })

  test('selects with every documented key and skips the disabled option', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openSelectPage(page, docs.url)
      const { plan, listbox } = partsOf(page, frame)
      const option = (name: string) =>
        listbox.getByRole('option', { name: new RegExp(`^${name}`) })

      await expect(plan).toHaveText('Team')
      await plan.focus()
      // Enter opens on the selected option.
      await openList(plan, listbox, (target) => target.press('Enter'))
      await expect(plan).toHaveAttribute('aria-expanded', 'true')
      await expect(option('Team')).toBeFocused()
      await expect(option('Team')).toHaveAttribute('aria-selected', 'true')

      // ArrowDown skips Enterprise (disabled) and loops to Starter.
      await page.keyboard.press('ArrowDown')
      await expect(option('Business')).toBeFocused()
      await expect(option('Enterprise')).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      await page.keyboard.press('ArrowDown')
      await expect(option('Starter')).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(option('Business')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(option('Starter')).toBeFocused()
      await page.keyboard.press('End')
      await expect(option('Business')).toBeFocused()

      // Typeahead matches the short textValue.
      await page.keyboard.press('t')
      await expect(option('Team')).toBeFocused()

      // Enter on an option selects it, closes, and returns focus.
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await expect(listbox).toBeHidden()
      await expect(plan).toBeFocused()
      await expect(plan).toHaveText('Business')
      await expect(plan).toHaveAttribute('aria-expanded', 'false')

      // Space opens; Space selects.
      await openList(plan, listbox, (target) => target.press(' '))
      await expect(option('Business')).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press(' ')
      await expect(listbox).toBeHidden()
      await expect(plan).toHaveText('Team')

      // ArrowUp opens on the selected option; Escape closes without change.
      await page.keyboard.press('ArrowUp')
      await expect(option('Team')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Escape')
      await expect(listbox).toBeHidden()
      await expect(plan).toBeFocused()
      await expect(plan).toHaveText('Team')

      // ArrowDown opens; Tab closes and moves on.
      await page.keyboard.press('ArrowDown')
      await expect(option('Team')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(listbox).toBeHidden()
      await expect(plan).toHaveText('Team')

      // Clicking the disabled option changes nothing.
      await openList(plan, listbox)
      await option('Enterprise').click({ force: true })
      await expect(listbox).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(plan).toHaveText('Team')
    } finally {
      await docs.close()
    }
  })

  test('requires a currency, then saves the chosen preferences', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openSelectPage(page, docs.url)
      const { currency, listbox, save, status, preview, taxRegion } = partsOf(
        page,
        frame,
      )

      await expect(currency).toHaveText('Choose a currency')
      await expect(currency).toHaveAttribute('aria-required', 'true')
      await expect(taxRegion).toBeDisabled()

      await expect(async () => {
        await save.click()
        await expect(currency).toBeFocused({ timeout: 500 })
      }).toPass()
      await expect(currency).toHaveAttribute('aria-invalid', 'true')
      await expect(preview.getByRole('alert')).toHaveText(
        'Choose an invoice currency.',
      )
      const describedBy =
        (await currency.getAttribute('aria-describedby')) ?? ''
      const errorId = await preview.getByRole('alert').getAttribute('id')
      expect(describedBy.split(' ')).toContain(errorId)
      await expect(status).toHaveText('')

      // With nothing selected, ArrowUp starts on the last option and
      // ArrowDown on the first.
      await openList(currency, listbox, (target) => target.press('ArrowUp'))
      await expect(
        listbox.getByRole('option', { name: 'Japanese yen (JPY)' }),
      ).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(currency).toBeFocused()

      // Choose Euro from the keyboard; the error clears without a save.
      await openList(currency, listbox, (target) => target.press('ArrowDown'))
      await expect(
        listbox.getByRole('option', { name: 'US dollar (USD)' }),
      ).toBeFocused()
      await page.keyboard.press('e')
      await page.keyboard.press('Enter')
      await expect(currency).toHaveText('Euro (EUR)')
      await expect(currency).not.toHaveAttribute('aria-invalid', 'true')
      await expect(preview.getByRole('alert')).toHaveCount(0)

      await save.click()
      await expect(status).toHaveText(
        'Preferences saved. Team plan, billed annually in EUR.',
      )
    } finally {
      await docs.close()
    }
  })

  test('the body-portaled list follows light and dark tokens', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, { bg: string; fg: string }> = {}
      for (const mode of modes) {
        const frame = await openSelectPage(page, docs.url, mode)
        const { plan, listbox } = partsOf(page, frame)
        await openList(plan, listbox)
        const content = page.locator('.ghost-select-content[data-state="open"]')
        expect(
          await content.evaluate(
            (element) =>
              element.parentElement === document.body &&
              element.closest('.ghost-example') === null,
          ),
        ).toBe(true)
        surfaces[mode] = await content.evaluate((element) => {
          const computed = getComputedStyle(element)
          return { bg: computed.backgroundColor, fg: computed.color }
        })
        expect(surfaces[mode].bg).not.toMatch(
          /^(transparent|rgba\(0, 0, 0, 0\))$/,
        )
        await page.keyboard.press('Escape')
      }
      expect(surfaces.light?.bg).not.toBe(surfaces.dark?.bg)
      expect(surfaces.light?.fg).not.toBe(surfaces.dark?.fg)
    } finally {
      await docs.close()
    }
  })

  test('long labels truncate in the trigger and wrap inside the list', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openSelectPage(page, docs.url)
      const { plan, delivery, listbox } = partsOf(page, frame)

      const value = delivery.locator('[data-part="value"]')
      const truncation = await value.evaluate((element) => ({
        overflow: element.scrollWidth > element.clientWidth,
        ellipsis: getComputedStyle(element).textOverflow,
        nowrap: getComputedStyle(element).whiteSpace,
      }))
      expect(truncation).toEqual({
        overflow: true,
        ellipsis: 'ellipsis',
        nowrap: 'nowrap',
      })
      // One line: the long trigger is as tall as the short one.
      const [planBox, deliveryBox] = await Promise.all([
        plan.boundingBox(),
        delivery.boundingBox(),
      ])
      expect(deliveryBox?.height).toBe(planBox?.height)

      await openList(delivery, listbox)
      const layout = await listbox.evaluate((element) => {
        const content = element.closest('.ghost-select-content')
        const box = (content ?? element).getBoundingClientRect()
        const long = [...element.querySelectorAll('[role="option"]')].find(
          (option) => option.textContent.includes('finance@'),
        )
        return {
          right: box.right,
          left: box.left,
          wraps: long ? long.getBoundingClientRect().height > 40 : false,
          viewport: window.innerWidth,
        }
      })
      expect(layout.left).toBeGreaterThanOrEqual(0)
      expect(layout.right).toBeLessThanOrEqual(layout.viewport)
      expect(layout.wraps).toBe(true)
    } finally {
      await docs.close()
    }
  })

  test('stacks the cycle and currency row on a phone without page overflow', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 375, height: 800 })
      const frame = await openSelectPage(page, docs.url)
      const { cycle, currency, delivery, listbox } = partsOf(page, frame)
      const [cycleBox, currencyBox] = await Promise.all([
        cycle.boundingBox(),
        currency.boundingBox(),
      ])
      if (!cycleBox || !currencyBox) throw new Error('unmeasured triggers')
      expect(currencyBox.y).toBeGreaterThan(cycleBox.y + cycleBox.height)

      await openList(delivery, listbox)
      const box = await page
        .locator('.ghost-select-content[data-state="open"]')
        .boundingBox()
      if (!box) throw new Error('unmeasured list')
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(375)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(0)
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and example text keeps its own type', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openSelectPage(page, docs.url)
      const { plan, preview } = partsOf(page, frame)

      const idle = await plan.boundingBox()
      await plan.hover()
      expect(await plan.boundingBox()).toEqual(idle)
      await plan.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(plan).toBeFocused()
      expect(await plan.boundingBox()).toEqual(idle)

      // Keyboard focus draws the token ring, inside the example's clip.
      const ring = await plan.evaluate((element) => {
        const computed = getComputedStyle(element)
        const clip = element.closest('.ghost-example')
        const box = element.getBoundingClientRect()
        const bounds = clip?.getBoundingClientRect()
        const room = 6
        return {
          style: computed.outlineStyle,
          fits: bounds
            ? box.left - room >= bounds.left && box.right + room <= bounds.right
            : false,
        }
      })
      expect(ring).toEqual({ style: 'solid', fits: true })

      // Docs prose margins and heading styles stay out of the card text.
      const read = (locator: Locator) =>
        locator.evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            size: Number.parseFloat(computed.fontSize),
          }
        })
      const heading = await read(preview.getByRole('heading', { level: 2 }))
      expect(heading.margin).toBe('0px')
      expect(heading.border).toBe('0px')
      const lead = await read(preview.locator('p').first())
      expect(lead.margin).toBe('0px')
      expect(lead.size).toBeLessThan(heading.size)
    } finally {
      await docs.close()
    }
  })
})
