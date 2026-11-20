import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostDatePicker'

type Playground = Awaited<ReturnType<typeof startStaticServer>>

let playground: Playground

test.beforeAll(async () => {
  playground = await startStaticServer('apps/playground/dist')
})

test.afterAll(async () => {
  await playground.close()
})

async function openExample(page: Page, id: string) {
  await page.goto(`${playground.url}/examples.html?id=${id}`)
  await expect(page.locator('[data-ghost-date-picker]').first()).toBeVisible()
  return {
    dialog: page.getByRole('dialog'),
    day: (iso: string) => page.locator(`[data-ghost-calendar-date="${iso}"]`),
    trigger: page.locator('[data-part="trigger"][data-ghost-date-picker]'),
  }
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

test.describe('GhostDatePicker', { tag }, () => {
  test('typed ISO entry commits on blur and Enter without submitting', async ({
    page,
  }) => {
    await openExample(page, 'date-picker/basic')
    const input = page.getByLabel('Due date')
    await expect(input).toHaveAttribute('aria-describedby', /.+/)
    await input.fill('2026-11-30')
    await expect(page.locator('output')).toHaveText('No date')
    await page.keyboard.press('Enter')
    await expect(page.locator('output')).toHaveText('2026-11-30')
    await expect(page.locator('input[type="hidden"][name="due"]')).toHaveValue(
      '2026-11-30',
    )

    await input.fill('2026-02-30')
    await input.blur()
    await expect(input).toHaveValue('2026-02-30')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('output')).toHaveText('2026-11-30')
    await expect(page.locator('input[type="hidden"][name="due"]')).toHaveValue(
      '2026-11-30',
    )

    // Escape restores committed text and clears the draft error.
    await input.focus()
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('2026-11-30')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('trigger opens a named modal that focuses today, and Escape restores focus', async ({
    page,
  }) => {
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/basic',
    )
    await axe(page)
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveAccessibleName('Choose date')

    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog).toHaveAccessibleName('Choose date')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(trigger).toHaveAttribute(
      'aria-controls',
      (await dialog.getAttribute('id')) ?? '',
    )
    await expect(day('2026-11-17')).toBeFocused()
    await axe(page)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(page.locator('output')).toHaveText('No date')
  })

  test('every documented grid key moves real focus; Enter commits and closes', async ({
    page,
  }) => {
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/basic',
    )
    await trigger.click()
    await expect(day('2026-11-17')).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(day('2026-11-18')).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(day('2026-11-17')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(day('2026-11-24')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(day('2026-11-17')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(day('2026-11-15')).toBeFocused()
    await page.keyboard.press('End')
    await expect(day('2026-11-21')).toBeFocused()
    await page.keyboard.press('PageDown')
    await expect(day('2026-12-21')).toBeFocused()
    await page.keyboard.press('PageUp')
    await expect(day('2026-11-21')).toBeFocused()
    await page.keyboard.press('Shift+PageDown')
    await expect(day('2027-11-21')).toBeFocused()
    await page.keyboard.press('Shift+PageUp')
    await expect(day('2026-11-21')).toBeFocused()
    await expect(day('2026-11-21')).toHaveAttribute('tabindex', '0')

    await page.keyboard.press('Space')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(page.getByLabel('Due date')).toHaveValue('2026-11-21')
    await expect(trigger).toHaveAccessibleName(
      'Choose date, selected date is Saturday, November 21, 2026',
    )

    await trigger.click()
    await expect(day('2026-11-21')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page.locator('output')).toHaveText('2026-11-22')
  })

  test('Tab cycles inside the dialog with one grid stop', async ({ page }) => {
    const { day, trigger, dialog } = await openExample(
      page,
      'date-picker/basic',
    )
    await trigger.click()
    await expect(day('2026-11-17')).toBeFocused()
    const close = dialog.getByRole('button', { name: 'Close date picker' })
    const previous = dialog.getByRole('button', { name: 'Previous month' })
    const next = dialog.getByRole('button', { name: 'Next month' })

    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(previous).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(next).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(day('2026-11-17')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(next).toBeFocused()

    await close.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('outside pointer dismissal does not activate the control underneath', async ({
    page,
  }) => {
    const { dialog, trigger } = await openExample(
      page,
      'date-picker/controlled',
    )
    await trigger.click()
    await expect(dialog).toBeVisible()
    const clear = page.getByRole('button', { name: 'Clear' })
    const box = await clear.boundingBox()
    if (!box) throw new Error('Clear button has no box')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(dialog).toBeHidden()
    await expect(page.getByLabel('Launch date')).toHaveValue('2026-12-01')
    await expect(trigger).toBeFocused()
  })

  test('range commits atomically after two activations and announces the end step', async ({
    page,
  }) => {
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/range',
    )
    const start = page.getByLabel('Start date')
    const end = page.getByLabel('End date')
    await expect(trigger).toHaveAccessibleName(
      'Choose dates, selected range is Friday, November 20, 2026 to Monday, November 23, 2026',
    )

    await trigger.click()
    await expect(day('2026-11-20')).toBeFocused()
    await day('2026-11-26').click()
    await expect(dialog.getByRole('status')).toHaveText('Choose an end date')
    await expect(start).toHaveValue('2026-11-20')
    await expect(day('2026-11-26')).toHaveAttribute('data-state', 'selected')

    // Earlier second endpoint is sorted.
    await day('2026-11-24').click()
    await expect(dialog).toBeHidden()
    await expect(start).toHaveValue('2026-11-24')
    await expect(end).toHaveValue('2026-11-26')
    await expect(
      page.locator('input[type="hidden"][name="stay[start]"]'),
    ).toHaveValue('2026-11-24')
    await expect(
      page.locator('input[type="hidden"][name="stay[end]"]'),
    ).toHaveValue('2026-11-26')

    // Cancelling after one activation keeps the committed range.
    await trigger.click()
    await day('2026-11-10').click()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(start).toHaveValue('2026-11-24')
    await expect(end).toHaveValue('2026-11-26')
  })

  test('range inputs keep drafts while focus moves between them', async ({
    page,
  }) => {
    await openExample(page, 'date-picker/range')
    const start = page.getByLabel('Start date')
    const end = page.getByLabel('End date')
    await start.fill('2026-12-10')
    await end.focus()
    await expect(start).not.toHaveAttribute('aria-invalid', 'true')
    await end.fill('2026-12-01')
    await page.keyboard.press('Enter')
    await expect(start).toHaveAttribute('aria-invalid', 'true')
    await expect(end).toHaveAttribute('aria-invalid', 'true')
    await expect(
      page.locator('input[type="hidden"][name="stay[start]"]'),
    ).toHaveValue('2026-11-20')
    await end.fill('2026-12-12')
    await page.keyboard.press('Enter')
    await expect(
      page.locator('input[type="hidden"][name="stay[end]"]'),
    ).toHaveValue('2026-12-12')
  })

  test('form validation blocks dirty and invalid drafts, submits ISO, and resets', async ({
    page,
  }) => {
    const { day, trigger, dialog } = await openExample(
      page,
      'date-picker/validation',
    )
    const start = page.getByLabel('Check-in')
    const end = page.getByLabel('Check-out')
    const output = page.locator('output')

    // Required and empty: native validation blocks submission.
    await page.getByRole('button', { name: 'Book' }).click()
    await expect(output).toHaveText('Not submitted')
    await expect(start).toBeFocused()
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Enter a date range' }),
    ).toBeVisible()

    // A dirty uncommitted draft blocks requestSubmit too.
    await start.fill('2026-12-01')
    const valid = await page.evaluate(() => {
      const form = document.querySelector('form')
      form?.requestSubmit()
      return form?.checkValidity()
    })
    expect(valid).toBe(false)
    await expect(output).toHaveText('Not submitted')

    await end.fill('2026-12-03')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Book' }).click()
    await expect(output).toHaveText('2026-12-01 to 2026-12-03')

    // validateRange rejects booked interior nights in the calendar.
    await trigger.click()
    await day('2026-12-02').click()
    await page.getByRole('button', { name: 'Previous month' }).click()
    await day('2026-11-24').click()
    await expect(dialog.getByRole('status')).toHaveText(
      'This stay includes booked nights',
    )
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')

    // Invalid submit while the modal is open focuses the error summary.
    await start.fill('2026-11-01')
    await trigger.click()
    await expect(dialog).toBeVisible()
    await page.evaluate(() => document.querySelector('form')?.requestSubmit())
    const summary = dialog.locator('[data-part="error-summary"]')
    await expect(summary).toBeFocused()
    await expect(summary).toContainText('Choose a date on or after')
    await expect(dialog).toBeVisible()
    await expect(output).toHaveText('2026-12-01 to 2026-12-03')
    await axe(page)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(start).toHaveValue('')
    await expect(end).toHaveValue('')
    await expect(
      page.locator('input[type="hidden"][name="stay[start]"]'),
    ).toHaveValue('')
  })

  test('controlled open and clear', async ({ page }) => {
    const { dialog, trigger } = await openExample(
      page,
      'date-picker/controlled',
    )
    await trigger.click()
    await expect(page.getByText('Calendar open')).toBeAttached()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Calendar closed')).toBeVisible()
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByLabel('Launch date')).toHaveValue('')
    await expect(page.locator('output')).toHaveText('No date')
  })

  test('custom format keeps display localized and the calendar labels German', async ({
    page,
  }) => {
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/custom-format',
    )
    const input = page.getByLabel('Termin')
    await expect(input).toHaveValue('24.11.2026')
    await expect(page.locator('input[name="termin"]')).toHaveValue('2026-11-24')
    await input.fill('2026-11-25')
    await input.blur()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await input.fill('25.11.2026')
    await input.blur()
    await expect(page.locator('input[name="termin"]')).toHaveValue('2026-11-25')

    await trigger.click()
    await expect(dialog).toHaveAccessibleName('Datum wählen')
    await expect(dialog.getByRole('heading')).toHaveText('November 2026')
    await expect(day('2026-11-25')).toBeFocused()
    await expect(
      dialog.getByRole('button', { name: 'Kalender schließen' }),
    ).toBeVisible()
  })

  test('arrow keys follow reading direction in RTL', async ({ page }) => {
    const { day, trigger } = await openExample(page, 'date-picker/rtl')
    await trigger.click()
    await expect(day('2026-11-18')).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(day('2026-11-19')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(day('2026-11-18')).toBeFocused()
    await axe(page)
  })

  test('inside a dialog, Escape closes only the top layer', async ({
    page,
  }) => {
    await page.goto(
      `${playground.url}/examples.html?id=date-picker/nested-dialog`,
    )
    await page.getByRole('button', { name: 'Schedule reminder' }).click()
    const outer = page.getByRole('dialog', { name: 'Schedule reminder' })
    await expect(outer).toBeVisible()
    const trigger = outer.locator('[data-part="trigger"]')
    await trigger.click()
    const picker = page.getByRole('dialog', { name: 'Choose date' })
    await expect(picker).toBeVisible()
    await axe(page)
    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
    await expect(outer).toBeVisible()
    await expect(trigger).toBeFocused()

    // Escape in an edited field reverts it without closing the dialog.
    const input = outer.getByLabel('Remind me on')
    await input.fill('2026-1')
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('')
    await expect(outer).toBeVisible()
  })

  test('themed picker has 44px targets and passes axe open and closed', async ({
    page,
  }) => {
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/themed',
    )
    await axe(page)
    const triggerBox = await trigger.boundingBox()
    expect(triggerBox?.height).toBeGreaterThanOrEqual(44)
    expect(triggerBox?.width).toBeGreaterThanOrEqual(44)
    await trigger.click()
    await expect(day('2026-12-04')).toBeFocused()
    const cellBox = await day('2026-12-04').boundingBox()
    expect(cellBox?.height).toBeGreaterThanOrEqual(44)
    expect(cellBox?.width).toBeGreaterThanOrEqual(44)
    const dialogBox = await dialog.boundingBox()
    const viewport = page.viewportSize()
    expect(dialogBox && viewport).toBeTruthy()
    if (dialogBox && viewport) {
      expect(dialogBox.x).toBeGreaterThanOrEqual(0)
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width)
    }
    await axe(page)
  })

  test('reflows at a 320px-wide viewport (400% zoom equivalent)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/themed',
    )
    await trigger.click()
    await expect(day('2026-12-04')).toBeFocused()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(320)
    }
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    )
    expect(scrollWidth).toBeLessThanOrEqual(320)
  })

  test('forced colors and reduced motion keep the picker usable', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    const { dialog, day, trigger } = await openExample(
      page,
      'date-picker/themed',
    )
    await trigger.click()
    await expect(dialog).toBeVisible()
    await expect(day('2026-12-04')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
})
