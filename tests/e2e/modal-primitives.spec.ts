import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

// Headless Chromium hides scrollbars (`hideScrollbars=true`, 0px width) by
// default; show classic scrollbars so the scroll-lock test exercises real
// padding-right compensation and proves zero horizontal layout shift.
test.use({
  launchOptions: {
    args: ['--blink-settings=hideScrollbars=false'],
  },
})

test.describe('modal primitives', () => {
  test('allows Tab within a portaled popover inside a trapped scope without pulling focus back', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const openTrigger = page.getByTestId('modal-fixture-open')
      await openTrigger.scrollIntoViewIfNeeded()
      await openTrigger.click()

      const modalSurface = page.getByTestId('modal-fixture-surface')
      await expect(modalSurface).toBeVisible()
      await expect(page.getByTestId('modal-fixture-first')).toBeFocused()

      // Open the portaled GhostPopover from inside the trapped modal scope.
      const popoverTrigger = page.getByTestId('modal-popover-trigger')
      await popoverTrigger.click()

      const popoverContent = page.getByTestId('modal-popover-content')
      await expect(popoverContent).toBeVisible()
      const isPortaled = await popoverContent.evaluate(
        (el) =>
          el.closest('[data-testid="modal-fixture-surface"]') === null &&
          el.closest('#app') === null,
      )
      expect(isPortaled).toBe(true)

      const popoverInput = page.getByTestId('modal-popover-input')
      const popoverAction = page.getByTestId('modal-popover-action')
      const popoverClose = page.getByTestId('modal-popover-close')

      await expect(popoverInput).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(popoverAction).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(popoverClose).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(popoverAction).toBeFocused()

      // Escape dismisses only the popover and returns focus to its trigger.
      await page.keyboard.press('Escape')
      await expect(popoverContent).toHaveCount(0)
      await expect(modalSurface).toBeVisible()
      await expect(popoverTrigger).toBeFocused()

      // Trapped Tab still wraps inside the modal after the popover closes.
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('modal-fixture-close')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('modal-fixture-first')).toBeFocused()

      // Second Escape closes the modal and restores focus to the opener.
      await page.keyboard.press('Escape')
      await expect(modalSurface).toHaveCount(0)
      await expect(openTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('locks body scroll without horizontal layout shift and restores original styles on close', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 1024, height: 600 })
      await page.goto(playground.url)

      const before = await page.evaluate(() => {
        window.scrollTo(0, 120)
        const main = document.querySelector('main')
        return {
          scrollY: window.scrollY,
          scrollbarWidth:
            window.innerWidth - document.documentElement.clientWidth,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        }
      })
      expect(before.scrollY).toBeGreaterThan(0)
      expect(before.scrollbarWidth).toBeGreaterThan(0)

      const openTrigger = page.getByTestId('modal-fixture-open')
      await openTrigger.scrollIntoViewIfNeeded()
      await openTrigger.click()

      const modalSurface = page.getByTestId('modal-fixture-surface')
      await expect(modalSurface).toBeVisible()

      const scrollBeforeAttempt = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(100)

      const during = await page.evaluate((baselineScrollY) => {
        const main = document.querySelector('main')
        return {
          overflow: document.body.style.overflow,
          computedOverflow: getComputedStyle(document.body).overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          scrollDelta: window.scrollY - baselineScrollY,
        }
      }, scrollBeforeAttempt)

      expect(during.overflow).toBe('hidden')
      expect(during.computedOverflow).toBe('hidden')
      expect(Number.parseFloat(during.paddingRight)).toBe(before.scrollbarWidth)
      expect(Math.abs(during.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(during.scrollDelta).toBe(0)

      await page.getByTestId('modal-fixture-close').click()
      await expect(modalSurface).toHaveCount(0)

      const after = await page.evaluate(() => {
        const main = document.querySelector('main')
        return {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
        }
      })
      expect(after.overflow).toBe(before.overflow)
      expect(after.paddingRight).toBe(before.paddingRight)
      expect(Math.abs(after.mainWidth - before.mainWidth)).toBeLessThan(1)
    } finally {
      await playground.close()
    }
  })

  test('marks background inert while skipping [data-ghost-live] and restores on close', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const openTrigger = page.getByTestId('modal-fixture-open')
      await openTrigger.scrollIntoViewIfNeeded()
      await openTrigger.click()

      const modalSurface = page.getByTestId('modal-fixture-surface')
      await expect(modalSurface).toBeVisible()

      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      const openState = await page.evaluate(() => {
        const app = document.getElementById('app')
        const live = document.querySelector('[data-ghost-live]')
        const bgButton = document.querySelector<HTMLButtonElement>(
          '[data-testid="open-trap"]',
        )
        bgButton?.focus()
        return {
          appInert: app?.hasAttribute('inert') ?? false,
          liveInert: live?.hasAttribute('inert') ?? false,
          bgFocused: document.activeElement === bgButton,
        }
      })

      expect(openState.appInert).toBe(true)
      expect(openState.liveInert).toBe(false)
      expect(openState.bgFocused).toBe(false)

      await page.getByTestId('modal-fixture-close').click()
      await expect(modalSurface).toHaveCount(0)

      const closedState = await page.evaluate(() => {
        const app = document.getElementById('app')
        const bgButton = document.querySelector<HTMLButtonElement>(
          '[data-testid="open-trap"]',
        )
        bgButton?.focus()
        return {
          appInert: app?.hasAttribute('inert') ?? false,
          bgFocused: document.activeElement === bgButton,
        }
      })

      expect(closedState.appInert).toBe(false)
      expect(closedState.bgFocused).toBe(true)
    } finally {
      await playground.close()
    }
  })
})
