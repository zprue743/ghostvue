import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

// GHO-169: tooltips join the shared dismissable-layer stack for `Escape`
// ordering only. One `Escape` closes the topmost overlay; an open tooltip never
// blocks outside-pointer dismissal of the dialog or popover beneath it.

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

// Open-state scans skip only axe's best-practice `region` rule: a tooltip
// portaled to <body> sits outside page landmarks by design and is exposed
// through the trigger's `aria-describedby`. Every other rule still runs.
async function expectNoAxeViolationsWithTooltipOpen(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze()
  expect(results.violations).toEqual([])
}

test.describe('GhostTooltip inside overlay layers', () => {
  test('closes a portaled, controlled tooltip before its modal dialog', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const dialogTrigger = page.getByTestId('tooltip-layers-dialog-trigger')
      const dialog = page.getByTestId('tooltip-layers-dialog-content')
      const tipTrigger = page.getByTestId('tooltip-layers-portal-trigger')
      const tip = page.getByTestId('tooltip-layers-portal-content')
      const status = page.getByTestId('tooltip-layers-status')

      await dialogTrigger.scrollIntoViewIfNeeded()
      await expectNoAxeViolations(page)

      await dialogTrigger.click()
      await expect(dialog).toBeVisible()

      await tipTrigger.focus()
      await expect(tip).toBeVisible()
      await expect(status).toContainText('Dialog open; controlled tooltip open')
      // Portaled outside the dialog content.
      expect(
        await tip.evaluate((el) => el.parentElement === document.body),
      ).toBe(true)
      await expect(tipTrigger).toHaveAttribute('aria-describedby', /.+/)
      await expectNoAxeViolationsWithTooltipOpen(page)

      await page.keyboard.press('Escape')
      await expect(tip).toHaveCount(0)
      await expect(dialog).toBeVisible()
      await expect(tipTrigger).toBeFocused()
      await expect(status).toContainText(
        'Dialog open; controlled tooltip closed',
      )

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(dialogTrigger).toBeFocused()
      await expect(status).toContainText('Dialog closed')
      await expectNoAxeViolations(page)
    } finally {
      await playground.close()
    }
  })

  test('closes an inline tooltip opened by keyboard focus before its dialog', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const dialogTrigger = page.getByTestId('tooltip-layers-dialog-trigger')
      const dialog = page.getByTestId('tooltip-layers-dialog-content')
      const portalTrigger = page.getByTestId('tooltip-layers-portal-trigger')
      const tipTrigger = page.getByTestId('tooltip-layers-inline-trigger')
      const tip = page.getByTestId('tooltip-layers-inline-content')

      await dialogTrigger.focus()
      await page.keyboard.press('Enter')
      await expect(dialog).toBeVisible()

      // Move with real Tab presses from the first tabbable in the dialog.
      await portalTrigger.focus()
      await page.keyboard.press('Tab')
      await expect(tipTrigger).toBeFocused()
      await expect(tip).toBeVisible()
      expect(
        await dialog.evaluate(
          (root, id) => root.querySelector(`[data-testid="${id}"]`) !== null,
          'tooltip-layers-inline-content',
        ),
      ).toBe(true)
      await expectNoAxeViolationsWithTooltipOpen(page)

      await page.keyboard.press('Escape')
      await expect(tip).toHaveCount(0)
      await expect(dialog).toBeVisible()
      await expect(tipTrigger).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(dialogTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('does not block outside-pointer dismissal of the dialog beneath an open tooltip', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const dialogTrigger = page.getByTestId('tooltip-layers-dialog-trigger')
      const dialog = page.getByTestId('tooltip-layers-dialog-content')
      const tipTrigger = page.getByTestId('tooltip-layers-portal-trigger')
      const tip = page.getByTestId('tooltip-layers-portal-content')

      await dialogTrigger.click()
      await expect(dialog).toBeVisible()

      await tipTrigger.hover()
      await expect(tip).toBeVisible()

      // Pressing the tooltip itself is not an outside press for the dialog.
      await tip.click()
      await expect(dialog).toBeVisible()

      // The tooltip stays open through its close delay while the overlay is
      // pressed, so the press must pass through to the dialog layer.
      await page.mouse.click(4, 4)
      await expect(dialog).toHaveCount(0)
      await expect(tip).toHaveCount(0)
    } finally {
      await playground.close()
    }
  })

  test('closes a tooltip above a popover first and keeps outside presses dismissing the popover', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const popoverTrigger = page.getByTestId('tooltip-layers-popover-trigger')
      const popover = page.getByTestId('tooltip-layers-popover-content')
      const tipTrigger = page.getByTestId('tooltip-layers-popover-tip-trigger')
      const tip = page.getByTestId('tooltip-layers-popover-tip-content')
      const outside = page.getByTestId('tooltip-layers-outside')

      await popoverTrigger.scrollIntoViewIfNeeded()
      await popoverTrigger.click()
      await expect(popover).toBeVisible()

      await tipTrigger.focus()
      await expect(tip).toBeVisible()
      await expectNoAxeViolationsWithTooltipOpen(page)

      await page.keyboard.press('Escape')
      await expect(tip).toHaveCount(0)
      await expect(popover).toBeVisible()
      await expect(tipTrigger).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(popover).toHaveCount(0)
      await expect(popoverTrigger).toBeFocused()

      await popoverTrigger.click()
      await expect(popover).toBeVisible()
      await tipTrigger.hover()
      await expect(tip).toBeVisible()

      await outside.click()
      await expect(popover).toHaveCount(0)
      await expect(tip).toHaveCount(0)
      await expectNoAxeViolations(page)
    } finally {
      await playground.close()
    }
  })
})
