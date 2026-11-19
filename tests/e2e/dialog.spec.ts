import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  classicScrollbarLaunchOptions,
  expectMeasuredScrollbar,
  expectScrollbarCompensation,
} from '../support'
import { startStaticServer } from './static-server'

// Show classic scrollbars in headless Chromium so scroll-lock padding-right
// compensation and zero horizontal layout shift are genuinely exercised.
// Firefox and WebKit keep their 0px overlay scrollbars (see the helper).
test.use({ launchOptions: classicScrollbarLaunchOptions })

test.describe('GhostDialog', () => {
  test('traps Tab/Shift+Tab, dismisses on Escape and overlay click, restores focus, and passes Axe @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('dialog-basic-trigger')
      const overlay = page.getByTestId('dialog-basic-overlay')
      const content = page.getByTestId('dialog-basic-content')
      const firstAction = page.getByTestId('dialog-basic-first')
      const closeButton = page.getByTestId('dialog-basic-close')

      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click()
      await expect(overlay).toBeVisible()
      await expect(content).toBeVisible()
      await expect(content).toHaveAttribute('role', 'dialog')
      await expect(content).toHaveAttribute('aria-modal', 'true')
      await expect(content).toHaveAttribute('data-state', 'open')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(firstAction).toBeFocused()

      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      // Tab forward wraps from last -> first; Shift+Tab wraps from first -> last.
      await page.keyboard.press('Tab')
      await expect(closeButton).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(firstAction).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(closeButton).toBeFocused()

      // Escape closes and restores focus to trigger.
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(overlay).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Reopen via keyboard and close by clicking backdrop overlay outside content.
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      await overlay.click({ position: { x: 8, y: 8 } })
      await expect(content).toHaveCount(0)
      await expect(overlay).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('honors closeOnEscape=false and closeOnOutsideClick=false', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('dialog-locked-trigger')
      const overlay = page.getByTestId('dialog-locked-overlay')
      const content = page.getByTestId('dialog-locked-content')
      const closeButton = page.getByTestId('dialog-locked-close')

      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      await expect(content).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(content).toBeVisible()

      await overlay.click({ position: { x: 8, y: 8 } })
      await expect(content).toBeVisible()

      await closeButton.click()
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('locks body scroll without horizontal layout shift and marks background inert while skipping [data-ghost-live]', async ({
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

      const trigger = page.getByTestId('dialog-basic-trigger')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()

      const content = page.getByTestId('dialog-basic-content')
      await expect(content).toBeVisible()

      const baselineScroll = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(100)

      const during = await page.evaluate((scrollStart) => {
        const main = document.querySelector('main')
        const app = document.getElementById('app')
        const live = document.querySelector(
          '[data-testid="dialog-live-region"]',
        )
        const outsideBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="dialog-outside-target"]',
        )
        outsideBtn?.focus()
        return {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          scrollDelta: window.scrollY - scrollStart,
          appInert: app?.hasAttribute('inert') ?? false,
          liveInert: live?.hasAttribute('inert') ?? false,
          outsideFocused: document.activeElement === outsideBtn,
        }
      }, baselineScroll)

      expect(during.overflow).toBe('hidden')
      expect(Number.parseFloat(during.paddingRight)).toBe(before.scrollbarWidth)
      expect(Math.abs(during.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(during.scrollDelta).toBe(0)
      expect(during.appInert).toBe(true)
      expect(during.liveInert).toBe(false)
      expect(during.outsideFocused).toBe(false)

      await page.getByTestId('dialog-basic-close').click()
      await expect(content).toHaveCount(0)

      const after = await page.evaluate(() => {
        const main = document.querySelector('main')
        const app = document.getElementById('app')
        const outsideBtn = document.querySelector<HTMLButtonElement>(
          '[data-testid="dialog-outside-target"]',
        )
        outsideBtn?.focus()
        return {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          appInert: app?.hasAttribute('inert') ?? false,
          outsideFocused: document.activeElement === outsideBtn,
        }
      })

      expect(after.overflow).toBe(before.overflow)
      expect(after.paddingRight).toBe(before.paddingRight)
      expect(Math.abs(after.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(after.appInert).toBe(false)
      expect(after.outsideFocused).toBe(true)
    } finally {
      await playground.close()
    }
  })

  test('dismisses nested modal dialogs one layer at a time on Escape @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const outerTrigger = page.getByTestId('dialog-nested-outer-trigger')
      const outerContent = page.getByTestId('dialog-nested-outer-content')
      const innerTrigger = page.getByTestId('dialog-nested-inner-trigger')
      const innerContent = page.getByTestId('dialog-nested-inner-content')

      await outerTrigger.scrollIntoViewIfNeeded()
      await outerTrigger.click()
      await expect(outerContent).toBeVisible()

      await innerTrigger.click()
      await expect(innerContent).toBeVisible()

      const nestedAxe = await new AxeBuilder({ page }).analyze()
      expect(nestedAxe.violations).toEqual([])

      // First Escape closes only the inner dialog and restores focus to innerTrigger.
      await page.keyboard.press('Escape')
      await expect(innerContent).toHaveCount(0)
      await expect(outerContent).toBeVisible()
      await expect(innerTrigger).toBeFocused()

      // Second Escape closes the outer dialog and restores focus to outerTrigger.
      await page.keyboard.press('Escape')
      await expect(outerContent).toHaveCount(0)
      await expect(outerTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('supports both portaled and portal=false popovers inside a modal dialog', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const dialogTrigger = page.getByTestId('dialog-popovers-trigger')
      const dialogContent = page.getByTestId('dialog-popovers-content')
      const dialogFirst = page.getByTestId('dialog-popovers-first')

      await dialogTrigger.scrollIntoViewIfNeeded()
      await dialogTrigger.click()
      await expect(dialogContent).toBeVisible()
      await expect(dialogFirst).toBeFocused()

      // 1. Portaled popover: Tab moves inside the portaled popover without getting pulled back.
      const portaledTrigger = page.getByTestId('dialog-pop-portaled-trigger')
      await portaledTrigger.click()
      const portaledContent = page.getByTestId('dialog-pop-portaled-content')
      await expect(portaledContent).toBeVisible()
      await expect(page.getByTestId('dialog-pop-portaled-input')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.getByTestId('dialog-pop-portaled-close')).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(portaledContent).toHaveCount(0)
      await expect(dialogContent).toBeVisible()
      await expect(portaledTrigger).toBeFocused()

      // 2. Inline (portal=false) popover: Tab past its last item stays inside the dialog (wraps to dialogFirst).
      const inlineTrigger = page.getByTestId('dialog-pop-inline-trigger')
      await inlineTrigger.click()
      const inlineContent = page.getByTestId('dialog-pop-inline-content')
      await expect(inlineContent).toBeVisible()
      await expect(page.getByTestId('dialog-pop-inline-action')).toBeFocused()

      await page.keyboard.press('Tab')
      const inlineClose = page.getByTestId('dialog-pop-inline-close')
      await expect(inlineClose).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(dialogFirst).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('supports modal=false, role="alertdialog", and themed dialog with Axe clean', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      // 1. modal=false leaves background active, renders no overlay, locks no scroll.
      const nonModalTrigger = page.getByTestId('dialog-nonmodal-trigger')
      const nonModalContent = page.getByTestId('dialog-nonmodal-content')
      const nonModalOverlay = page.getByTestId('dialog-nonmodal-overlay')
      const outsideTarget = page.getByTestId('dialog-outside-target')

      await nonModalTrigger.scrollIntoViewIfNeeded()
      await nonModalTrigger.click()
      await expect(nonModalContent).toBeVisible()
      await expect(nonModalOverlay).toHaveCount(0)
      expect(
        await nonModalContent.evaluate((el) => el.hasAttribute('aria-modal')),
      ).toBe(false)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(
        await page.evaluate(
          () => document.getElementById('app')?.hasAttribute('inert') ?? false,
        ),
      ).toBe(false)

      await outsideTarget.click()
      await expect(nonModalContent).toHaveCount(0)
      await expect(outsideTarget).toBeFocused()

      // 2. Themed modal dialog opens, applies elevation-4 styles, and passes Axe.
      const themedTrigger = page.getByTestId('dialog-themed-trigger')
      const themedOverlay = page.getByTestId('dialog-themed-overlay')
      const themedContent = page.getByTestId('dialog-themed-content')

      await themedTrigger.scrollIntoViewIfNeeded()
      await themedTrigger.click()
      await expect(themedOverlay).toBeVisible()
      await expect(themedContent).toBeVisible()
      await expect(themedContent).toHaveAttribute('data-themed', '')
      const themedAxe = await new AxeBuilder({ page }).analyze()
      expect(themedAxe.violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(themedContent).toHaveCount(0)
      await expect(themedTrigger).toBeFocused()

      // 3. Themed alertdialog ignores overlay click by default and closes on Escape/action.
      const alertTrigger = page.getByTestId('dialog-alert-trigger')
      const alertOverlay = page.getByTestId('dialog-alert-overlay')
      const alertContent = page.getByTestId('dialog-alert-content')

      await alertTrigger.scrollIntoViewIfNeeded()
      await alertTrigger.click()
      await expect(alertContent).toBeVisible()
      await expect(alertContent).toHaveAttribute('role', 'alertdialog')

      const alertAxe = await new AxeBuilder({ page }).analyze()
      expect(alertAxe.violations).toEqual([])

      await alertOverlay.click({ position: { x: 8, y: 8 } })
      await expect(alertContent).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(alertContent).toHaveCount(0)
      await expect(alertTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('locks viewport scrolling when html has overflow-y: scroll, preserves nested locks, and restores styles on close @cross-browser', async ({
    page,
    browserName,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 1024, height: 600 })
      await page.goto(playground.url)
      await page.addStyleTag({ content: 'html { overflow-y: scroll; }' })

      const before = await page.evaluate(() => {
        window.scrollTo(0, 120)
        const main = document.querySelector('main')
        return {
          scrollY: window.scrollY,
          scrollbarWidth:
            window.innerWidth - document.documentElement.clientWidth,
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          rootStyleAttr: document.documentElement.hasAttribute('style'),
          bodyStyleAttr: document.body.hasAttribute('style'),
        }
      })
      expect(before.scrollY).toBeGreaterThan(0)
      expectMeasuredScrollbar(browserName, before.scrollbarWidth)
      expect(before.rootStyleAttr).toBe(false)
      expect(before.bodyStyleAttr).toBe(false)

      const outerTrigger = page.getByTestId('dialog-nested-outer-trigger')
      const outerContent = page.getByTestId('dialog-nested-outer-content')
      const innerTrigger = page.getByTestId('dialog-nested-inner-trigger')
      const innerContent = page.getByTestId('dialog-nested-inner-content')

      await outerTrigger.scrollIntoViewIfNeeded()
      await outerTrigger.click()
      await expect(outerContent).toBeVisible()

      const baselineScroll = await page.evaluate(() => window.scrollY)

      // Wheel and keyboard scroll outside the dialog must not scroll the viewport.
      await page.mouse.move(10, 10)
      await page.mouse.wheel(0, 300)
      await page.keyboard.press('PageDown')
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)

      const duringOuter = await page.evaluate((scrollStart) => {
        const main = document.querySelector('main')
        return {
          rootOverflow: document.documentElement.style.overflow,
          rootPaddingRight: document.documentElement.style.paddingRight,
          bodyHasStyle: document.body.hasAttribute('style'),
          mainWidth: main ? main.getBoundingClientRect().width : 0,
          scrollDelta: window.scrollY - scrollStart,
        }
      }, baselineScroll)

      expect(duringOuter.rootOverflow).toBe('hidden')
      expectScrollbarCompensation(
        duringOuter.rootPaddingRight,
        before.scrollbarWidth,
        '',
      )
      expect(duringOuter.bodyHasStyle).toBe(false)
      expect(Math.abs(duringOuter.mainWidth - before.mainWidth)).toBeLessThan(1)
      expect(duringOuter.scrollDelta).toBe(0)

      // Opening a nested dialog preserves the existing lock without double padding.
      await innerTrigger.click()
      await expect(innerContent).toBeVisible()

      const duringNested = await page.evaluate(() => ({
        rootOverflow: document.documentElement.style.overflow,
        rootPaddingRight: document.documentElement.style.paddingRight,
      }))
      expect(duringNested.rootOverflow).toBe('hidden')
      expectScrollbarCompensation(
        duringNested.rootPaddingRight,
        before.scrollbarWidth,
        '',
      )

      // Closing inner dialog keeps viewport locked for the outer dialog.
      await page.getByTestId('dialog-nested-inner-close').click()
      await expect(innerContent).toHaveCount(0)
      await expect(outerContent).toBeVisible()

      await page.mouse.move(10, 10)
      await page.mouse.wheel(0, 250)
      await page.waitForTimeout(100)

      const afterInnerClose = await page.evaluate(
        (scrollStart) => ({
          rootOverflow: document.documentElement.style.overflow,
          scrollDelta: window.scrollY - scrollStart,
        }),
        baselineScroll,
      )
      expect(afterInnerClose.rootOverflow).toBe('hidden')
      expect(afterInnerClose.scrollDelta).toBe(0)

      // Closing outer dialog restores documentElement inline styles and unlocks scrolling.
      await page.getByTestId('dialog-nested-outer-close').click()
      await expect(outerContent).toHaveCount(0)

      const afterOuterClose = await page.evaluate(() => {
        const main = document.querySelector('main')
        return {
          rootHasStyle: document.documentElement.hasAttribute('style'),
          bodyHasStyle: document.body.hasAttribute('style'),
          mainWidth: main ? main.getBoundingClientRect().width : 0,
        }
      })
      expect(afterOuterClose.rootHasStyle).toBe(false)
      expect(afterOuterClose.bodyHasStyle).toBe(false)
      expect(
        Math.abs(afterOuterClose.mainWidth - before.mainWidth),
      ).toBeLessThan(1)

      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(100)
      const unlockedScroll = await page.evaluate(() => window.scrollY)
      expect(unlockedScroll).toBeGreaterThan(baselineScroll)
    } finally {
      await playground.close()
    }
  })

  for (const mode of ['default-body', 'html-overflow-y-scroll'] as const) {
    test(`keeps scrollable dialog content scrollable while locking viewport (${mode})`, async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.setViewportSize({ width: 1024, height: 600 })
        await page.goto(playground.url)
        if (mode === 'html-overflow-y-scroll') {
          await page.addStyleTag({ content: 'html { overflow-y: scroll; }' })
        }

        const trigger = page.getByTestId('dialog-scrollable-trigger')
        await trigger.scrollIntoViewIfNeeded()
        await trigger.click()

        const content = page.getByTestId('dialog-scrollable-content')
        const scrollBody = page.getByTestId('dialog-scrollable-body')
        await expect(content).toBeVisible()
        await expect(scrollBody).toBeVisible()

        const baselineWindowScroll = await page.evaluate(() => window.scrollY)

        // Wheel outside the dialog does not scroll the viewport.
        await page.mouse.move(10, 10)
        await page.mouse.wheel(0, 250)
        await page.waitForTimeout(100)
        expect(await page.evaluate(() => window.scrollY)).toBe(
          baselineWindowScroll,
        )

        // Wheel inside the dialog scrolls the dialog body, not the viewport.
        const box = await scrollBody.boundingBox()
        expect(box).not.toBeNull()
        if (!box) {
          throw new Error('Expected scrollable dialog body bounding box')
        }
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, 180)
        await page.waitForTimeout(100)

        const afterWheel = await page.evaluate(() => {
          const el = document.querySelector(
            '[data-testid="dialog-scrollable-body"]',
          )
          return {
            dialogScrollTop: el ? el.scrollTop : 0,
            windowScrollY: window.scrollY,
          }
        })
        expect(afterWheel.dialogScrollTop).toBeGreaterThan(0)
        expect(afterWheel.windowScrollY).toBe(baselineWindowScroll)

        // Keyboard scrolling inside the focused dialog body scrolls it further.
        await scrollBody.focus()
        await page.keyboard.press('PageDown')
        await page.waitForTimeout(100)

        const afterKey = await page.evaluate(() => {
          const el = document.querySelector(
            '[data-testid="dialog-scrollable-body"]',
          )
          return {
            dialogScrollTop: el ? el.scrollTop : 0,
            windowScrollY: window.scrollY,
          }
        })
        expect(afterKey.dialogScrollTop).toBeGreaterThan(
          afterWheel.dialogScrollTop,
        )
        expect(afterKey.windowScrollY).toBe(baselineWindowScroll)

        await page.getByTestId('dialog-scrollable-close').click()
        await expect(content).toHaveCount(0)
      } finally {
        await playground.close()
      }
    })
  }
})

// GHO-209: focusReady / initialFocus / returnFocus on GhostDialogContent.
// Readiness is flipped with a synthetic click on an in-dialog control so the
// pointer never moves focus; every focus assertion below is real browser focus.
test.describe('GhostDialog deferred focus entry', () => {
  async function openDeferred(page: Page) {
    const trigger = page.getByTestId('dialog-deferred-trigger')
    const content = page.getByTestId('dialog-deferred-content')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(content).toBeVisible()
    return { trigger, content }
  }

  async function markReady(page: Page) {
    await page.getByTestId('dialog-deferred-first').dispatchEvent('click')
    await expect(page.getByTestId('dialog-deferred-target')).toBeFocused()
  }

  async function activeTestId(page: Page) {
    return page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? null,
    )
  }

  test('waits for readiness, focuses the registered target, keeps the trap, and restores the opener @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      // Some playground fixtures carry their own inert subtrees.
      const inertBefore = await page.locator('[inert]').count()
      const { trigger, content } = await openDeferred(page)
      await expect(content).toHaveAttribute('aria-modal', 'true')
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

      // Not ready: nothing inside the dialog has focus yet.
      const insideBeforeReady = await content.evaluate((element) =>
        element.contains(document.activeElement),
      )
      expect(insideBeforeReady).toBe(false)

      await markReady(page)
      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      // Readiness dropping after activation keeps the trap.
      await page.getByTestId('dialog-deferred-unready').dispatchEvent('click')
      await page.getByTestId('dialog-deferred-first').focus()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('dialog-deferred-close')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('dialog-deferred-first')).toBeFocused()
      await expect(page.getByTestId('dialog-deferred-target')).not.toBeFocused()

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Cleanup: no inert or scroll lock left behind; reopening gates again.
      await expect(page.locator('[inert]')).toHaveCount(inertBefore)
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      expect(
        await content.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(false)
      await markReady(page)
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('restores the opener when closed before readiness', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const { trigger, content } = await openDeferred(page)
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('closes nested dialogs one layer at a time above a deferred dialog', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const { trigger, content } = await openDeferred(page)
      await markReady(page)

      const nestedTrigger = page.getByTestId('dialog-deferred-nested-trigger')
      const nestedContent = page.getByTestId('dialog-deferred-nested-content')
      await nestedTrigger.focus()
      await page.keyboard.press('Enter')
      await expect(nestedContent).toBeVisible()
      await expect(
        page.getByTestId('dialog-deferred-nested-close'),
      ).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(
        page.getByTestId('dialog-deferred-nested-close'),
      ).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(nestedContent).toHaveCount(0)
      await expect(content).toBeVisible()
      await expect(nestedTrigger).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  for (const action of ['disable', 'remove'] as const) {
    test(`returns focus to the input when the opener is ${action === 'disable' ? 'disabled' : 'removed'}`, async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)
        const { trigger, content } = await openDeferred(page)
        await markReady(page)
        await page.getByTestId(`dialog-deferred-${action}-trigger`).click()
        if (action === 'disable') {
          await expect(trigger).toBeDisabled()
        } else {
          await expect(trigger).toHaveCount(0)
        }
        await page.keyboard.press('Escape')
        await expect(content).toHaveCount(0)
        await expect(page.getByTestId('dialog-deferred-input')).toBeFocused()
      } finally {
        await playground.close()
      }
    })
  }

  test('keeps focus and the trap when a controlled parent ignores close', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const { trigger, content } = await openDeferred(page)
      await markReady(page)

      const keepOpen = page.getByTestId('dialog-deferred-keep-open')
      await keepOpen.focus()
      await page.keyboard.press('Space')
      await expect(keepOpen).toBeChecked()

      await page.keyboard.press('Escape')
      await expect(content).toBeVisible()
      await expect(keepOpen).toBeFocused()
      await page.getByTestId('dialog-deferred-close').focus()
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      await expect(page.getByTestId('dialog-deferred-close')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('dialog-deferred-first')).toBeFocused()
      expect(await activeTestId(page)).toBe('dialog-deferred-first')

      await keepOpen.focus()
      await page.keyboard.press('Space')
      await expect(keepOpen).not.toBeChecked()
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
