import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'

import { gotoPlayground, playgroundTest as test, expect } from '../support'

/**
 * Overlay exit presence matrix (docs/components/presence-spec.md, Test plan).
 * Modal fixture: themed GhostDialog. Non-modal fixture: themed GhostPopover.
 * Fixtures live in apps/playground/src/PresenceReference.vue.
 */

/** Stretches the themed exits so mid-exit assertions are deterministic. */
async function setThemedExit(page: Page, ms: number): Promise<void> {
  await page.addStyleTag({
    content: `[data-testid^='presence-'][data-themed][data-state='closed'] {
      --ghost-motion-exit-duration: ${String(ms)}ms;
      --ghost-motion-fade-duration: ${String(ms)}ms;
    }`,
  })
}

interface SurfaceSnapshot {
  connected: boolean
  inBody: boolean
  state: string | null
  inert: boolean
  pointerEvents: string
  placement: string | null
  left: string
  top: string
}

function snapshot(surface: Locator): Promise<SurfaceSnapshot> {
  return surface.evaluate((element: HTMLElement) => ({
    connected: element.isConnected,
    inBody: document.body.contains(element),
    state: element.getAttribute('data-state'),
    inert: element.hasAttribute('inert'),
    pointerEvents: element.style.pointerEvents,
    placement: element.getAttribute('data-placement'),
    left: element.style.left,
    top: element.style.top,
  }))
}

/**
 * Waits for the entry transition to finish. Closing mid-entry makes the
 * browser reverse the running transition with a proportionally shortened
 * duration (CSS Transitions "reversing shortening"), which would make the
 * mid-exit assertions below race a much shorter exit.
 */
async function settled(surface: Locator): Promise<void> {
  await surface.evaluate((element) =>
    Promise.allSettled(
      element.getAnimations().map((animation) => animation.finished),
    ),
  )
}

/** Tags the current DOM node so a later read proves node identity. */
async function markNode(surface: Locator): Promise<void> {
  await surface.evaluate((element) => {
    element.setAttribute('data-presence-marker', 'original')
  })
}

/** True when the element or any ancestor is inert (background isolation). */
function inInertTree(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => element.closest('[inert]') !== null)
}

function scrollLocked(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.body.style.overflow === 'hidden' ||
      document.documentElement.style.overflow === 'hidden',
  )
}

function fixtures(page: Page) {
  return {
    dialogTrigger: page.getByTestId('presence-dialog-trigger'),
    dialogContent: page.getByTestId('presence-dialog-content'),
    dialogOverlay: page.getByTestId('presence-dialog-overlay'),
    dialogFirst: page.getByTestId('presence-dialog-first'),
    nestedTrigger: page.getByTestId('presence-nested-trigger'),
    nestedContent: page.getByTestId('presence-nested-content'),
    popoverTrigger: page.getByTestId('presence-popover-trigger'),
    popoverContent: page.getByTestId('presence-popover-content'),
    popoverInput: page.getByTestId('presence-popover-input'),
    under: page.getByTestId('presence-popover-under'),
    underCount: page.getByTestId('presence-popover-under-count'),
    pageButton: page.getByTestId('presence-page-button'),
    pageCount: page.getByTestId('presence-page-count'),
    mountToggle: page.getByTestId('presence-mount-toggle'),
  }
}

test.describe('overlay exit presence', () => {
  test.beforeEach(async ({ page, playgroundUrl }) => {
    await gotoPlayground(page, playgroundUrl)
    await page.getByTestId('presence-reference').scrollIntoViewIfNeeded()
  })

  test('modal Dialog releases focus, locks and interactivity at logical close, then unmounts @cross-browser', async ({
    page,
  }) => {
    await setThemedExit(page, 1500)
    const f = fixtures(page)
    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    expect(await scrollLocked(page)).toBe(true)
    expect(await inInertTree(f.pageButton)).toBe(true)

    await page.keyboard.press('Escape')
    const content = await snapshot(f.dialogContent)
    const overlay = await snapshot(f.dialogOverlay)
    expect(content).toMatchObject({
      inBody: true,
      state: 'closed',
      inert: true,
      pointerEvents: 'none',
    })
    expect(overlay).toMatchObject({
      inBody: true,
      state: 'closed',
      pointerEvents: 'none',
    })
    await expect(f.dialogTrigger).toHaveAttribute('aria-expanded', 'false')
    await expect(f.dialogTrigger).toBeFocused()
    expect(await scrollLocked(page)).toBe(false)
    expect(await inInertTree(f.pageButton)).toBe(false)

    await expect(f.dialogContent).toHaveCount(0)
    await expect(f.dialogOverlay).toHaveCount(0)
    await expect(f.dialogTrigger).toBeFocused()
  })

  test('non-modal Popover keeps its placement while exiting and restores focus @cross-browser', async ({
    page,
  }) => {
    await setThemedExit(page, 1500)
    const f = fixtures(page)
    await f.popoverTrigger.click()
    await expect(f.popoverInput).toBeFocused()
    await settled(f.popoverContent)

    await page.keyboard.press('Escape')
    const exiting = await snapshot(f.popoverContent)
    expect(exiting).toMatchObject({
      inBody: true,
      state: 'closed',
      inert: true,
      pointerEvents: 'none',
      placement: 'bottom-start',
    })
    expect(exiting.left).not.toBe('0px')
    expect(exiting.top).not.toBe('0px')
    await expect(f.popoverTrigger).toHaveAttribute('aria-expanded', 'false')
    await expect(f.popoverTrigger).toBeFocused()
    await expect(f.popoverContent).toHaveCount(0)
  })

  test('clicks and Tab pass through exiting surfaces, and removal never moves focus', async ({
    page,
  }) => {
    await setThemedExit(page, 2000)
    const f = fixtures(page)

    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    await page.keyboard.press('Escape')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await f.pageButton.click()
    await expect(f.pageCount).toHaveText('1')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await expect(f.pageButton).toBeFocused()
    await page.keyboard.press('Tab')
    const tabbedInside = await f.dialogContent.evaluate((element) =>
      element.contains(document.activeElement),
    )
    expect(tabbedInside).toBe(false)
    await expect(f.dialogContent).toHaveCount(0)
    // Focus stays where the user moved it during the exit.
    expect(
      await page.evaluate(() => document.activeElement?.tagName ?? null),
    ).not.toBe('BODY')
    await expect(f.dialogTrigger).not.toBeFocused()

    await f.popoverTrigger.click()
    await expect(f.popoverInput).toBeFocused()
    await settled(f.popoverContent)
    const popoverBox = await f.popoverContent.boundingBox()
    const underBox = await f.under.boundingBox()
    expect(popoverBox).not.toBeNull()
    expect(underBox).not.toBeNull()
    if (!popoverBox || !underBox) return
    const left = Math.max(popoverBox.x, underBox.x)
    const right = Math.min(
      popoverBox.x + popoverBox.width,
      underBox.x + underBox.width,
    )
    const top = Math.max(popoverBox.y, underBox.y)
    const bottom = Math.min(
      popoverBox.y + popoverBox.height,
      underBox.y + underBox.height,
    )
    expect(right).toBeGreaterThan(left)
    expect(bottom).toBeGreaterThan(top)

    await page.keyboard.press('Escape')
    await expect(f.popoverContent).toHaveAttribute('data-state', 'closed')
    await page.mouse.click((left + right) / 2, (top + bottom) / 2)
    await expect(f.underCount).toHaveText('1')
    await expect(f.under).toBeFocused()
    await expect(f.popoverContent).toHaveCount(0)
    await expect(f.under).toBeFocused()
  })

  test('outside pointer dismissal starts the exit with the documented focus outcome @cross-browser', async ({
    page,
  }) => {
    await setThemedExit(page, 1000)
    const f = fixtures(page)

    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    await f.dialogOverlay.click({ position: { x: 8, y: 8 } })
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await expect(f.dialogTrigger).toBeFocused()
    await expect(f.dialogContent).toHaveCount(0)
    await expect(f.dialogOverlay).toHaveCount(0)
    await expect(f.dialogTrigger).toBeFocused()

    await f.popoverTrigger.click()
    await expect(f.popoverInput).toBeFocused()
    await settled(f.popoverContent)
    await f.pageButton.click()
    await expect(f.popoverContent).toHaveAttribute('data-state', 'closed')
    await expect(f.pageButton).toBeFocused()
    await expect(f.popoverContent).toHaveCount(0)
    await expect(f.pageButton).toBeFocused()
  })

  test('nested Popover in Dialog: a second Escape reaches the Dialog mid-exit @cross-browser', async ({
    page,
  }) => {
    await setThemedExit(page, 1500)
    const f = fixtures(page)
    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    await f.nestedTrigger.click()
    await expect(f.nestedContent).toHaveAttribute('data-state', 'open')
    await settled(f.nestedContent)

    await page.keyboard.press('Escape')
    await expect(f.nestedContent).toHaveAttribute('data-state', 'closed')
    await expect(f.nestedTrigger).toBeFocused()
    await expect(f.dialogContent).toHaveAttribute('data-state', 'open')

    await page.keyboard.press('Escape')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await expect(f.dialogTrigger).toBeFocused()
    await expect(f.nestedContent).toHaveCount(0)
    await expect(f.dialogContent).toHaveCount(0)
  })

  test('reduced motion fades without spatial travel, then unmounts', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await setThemedExit(page, 1500)
    const f = fixtures(page)

    for (const [trigger, content, travel] of [
      [f.dialogTrigger, f.dialogContent, 'translate'],
      [f.popoverTrigger, f.popoverContent, 'scale'],
    ] as const) {
      await trigger.click()
      await expect(content).toHaveAttribute('data-state', 'open')
      await settled(content)
      await page.keyboard.press('Escape')
      const exit = await content.evaluate((element, property) => {
        const style = getComputedStyle(element)
        return {
          travel: style.getPropertyValue(property),
          properties: element
            .getAnimations()
            .filter((animation) => animation instanceof CSSTransition)
            .map((transition) => transition.transitionProperty),
        }
      }, travel)
      expect(['none', '1']).toContain(exit.travel)
      expect(exit.properties).toEqual(['opacity'])
      await expect(content).toHaveCount(0)
    }
  })

  test('absent and zero-duration motion unmount in the close frame; a positive delay keeps the surface', async ({
    page,
  }) => {
    for (const [trigger, content] of [
      ['presence-headless-dialog-trigger', 'presence-headless-dialog-content'],
      [
        'presence-headless-popover-trigger',
        'presence-headless-popover-content',
      ],
    ] as const) {
      await page.getByTestId(trigger).click()
      await expect(page.getByTestId(content)).toBeVisible()
      await page.keyboard.press('Escape')
      expect(
        await page.evaluate(
          (id) => document.querySelector(`[data-testid="${id}"]`),
          content,
        ),
      ).toBeNull()
    }

    // Themed surfaces at --ghost-motion-intensity: 0 compute 0ms exits.
    await page.addStyleTag({
      content: '#presence-portal-layer { --ghost-motion-intensity: 0; }',
    })
    const f = fixtures(page)
    await f.dialogTrigger.click()
    await expect(f.dialogContent).toBeVisible()
    await page.keyboard.press('Escape')
    expect(
      await page.evaluate(() =>
        document.querySelector('[data-testid="presence-dialog-content"]'),
      ),
    ).toBeNull()

    // transition: opacity 0ms 300ms changes opacity only after the delay.
    await page.addStyleTag({
      content: `[data-testid='presence-headless-dialog-content'][data-state='closed'] {
        opacity: 0;
        transition: opacity 0ms 300ms;
      }`,
    })
    const trigger = page.getByTestId('presence-headless-dialog-trigger')
    const delayed = page.getByTestId('presence-headless-dialog-content')
    await trigger.click()
    await expect(delayed).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await snapshot(delayed)).toMatchObject({
      connected: true,
      state: 'closed',
      inert: true,
    })
    await expect(trigger).toBeFocused()
    await expect(delayed).toHaveCount(0)
  })

  test('an interrupted exit reopens the same node and re-activates the overlay @cross-browser', async ({
    page,
  }) => {
    await setThemedExit(page, 2000)
    const f = fixtures(page)

    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    await markNode(f.dialogContent)
    await page.keyboard.press('Escape')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await expect(f.dialogTrigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'open')
    await expect(f.dialogContent).toHaveAttribute(
      'data-presence-marker',
      'original',
    )
    await expect(f.dialogContent).not.toHaveAttribute('inert', '')
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    expect(await scrollLocked(page)).toBe(true)
    expect(await inInertTree(f.pageButton)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(f.dialogContent).toHaveCount(0)

    await f.popoverTrigger.click()
    await expect(f.popoverInput).toBeFocused()
    await settled(f.popoverContent)
    await markNode(f.popoverContent)
    await page.keyboard.press('Escape')
    await expect(f.popoverContent).toHaveAttribute('data-state', 'closed')
    await f.popoverTrigger.click()
    await expect(f.popoverContent).toHaveAttribute('data-state', 'open')
    await expect(f.popoverContent).toHaveAttribute(
      'data-presence-marker',
      'original',
    )
    const reopened = await snapshot(f.popoverContent)
    expect(reopened).toMatchObject({
      inert: false,
      pointerEvents: '',
      placement: 'bottom-start',
    })
    await expect(f.popoverInput).toBeFocused()
    await settled(f.popoverContent)
  })

  test('a stale completion after reopen never unmounts the reopened overlay', async ({
    page,
  }) => {
    await setThemedExit(page, 300)
    const f = fixtures(page)

    for (const host of ['dialog', 'popover'] as const) {
      const trigger = host === 'dialog' ? f.dialogTrigger : f.popoverTrigger
      const content = host === 'dialog' ? f.dialogContent : f.popoverContent
      const focusTarget = host === 'dialog' ? f.dialogFirst : f.popoverInput

      await trigger.click()
      await expect(focusTarget).toBeFocused()
      await settled(content)
      await markNode(content)
      await page.keyboard.press('Escape')
      await expect(content).toHaveAttribute('inert', '')
      await expect(trigger).toBeFocused()
      await page.waitForTimeout(60)
      await page.keyboard.press('Enter')
      await expect(content).toHaveAttribute('data-state', 'open')
      await content.evaluate((element) => {
        element.dispatchEvent(
          new TransitionEvent('transitionend', {
            propertyName: 'opacity',
            bubbles: true,
          }),
        )
      })
      await page.waitForTimeout(350)

      await expect(content).toBeVisible()
      await expect(content).toHaveAttribute('data-presence-marker', 'original')
      expect(await snapshot(content)).toMatchObject({
        inBody: true,
        state: 'open',
        inert: false,
        pointerEvents: '',
      })
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(trigger).toHaveAttribute('data-state', 'open')
      await expect(focusTarget).toBeFocused()

      if (host === 'dialog') {
        for (let press = 0; press < 4; press += 1) {
          await page.keyboard.press('Tab')
          expect(
            await content.evaluate((element) =>
              element.contains(document.activeElement),
            ),
          ).toBe(true)
        }
        expect(await scrollLocked(page)).toBe(true)
        expect(await inInertTree(f.pageButton)).toBe(true)
      }

      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(content).toHaveCount(0)
    }
  })

  test('inline (portal=false) exits in place, and owner unmount mid-exit cleans up', async ({
    page,
  }) => {
    await setThemedExit(page, 1500)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const f = fixtures(page)

    for (const [trigger, content] of [
      ['presence-inline-dialog-trigger', 'presence-inline-dialog-content'],
      ['presence-inline-popover-trigger', 'presence-inline-popover-content'],
    ] as const) {
      await page.getByTestId(trigger).click()
      await expect(page.getByTestId(content)).toHaveAttribute(
        'data-state',
        'open',
      )
      await settled(page.getByTestId(content))
      await page.keyboard.press('Escape')
      const parentIsFixture = await page
        .getByTestId(content)
        .evaluate(
          (element) =>
            element.closest('.presence-reference__fixtures') !== null,
        )
      expect(parentIsFixture).toBe(true)
      await expect(page.getByTestId(content)).toHaveAttribute(
        'data-state',
        'closed',
      )
      await expect(page.getByTestId(content)).toHaveCount(0)
    }

    await f.dialogTrigger.click()
    await expect(f.dialogFirst).toBeFocused()
    await settled(f.dialogContent)
    await page.keyboard.press('Escape')
    await expect(f.dialogContent).toHaveAttribute('data-state', 'closed')
    await f.mountToggle.click()
    await expect(f.dialogContent).toHaveCount(0)
    await expect(f.dialogOverlay).toHaveCount(0)
    expect(await scrollLocked(page)).toBe(false)
    // Background isolation released: the page and the remaining fixtures
    // are interactive again (other playground sections own their own inert).
    expect(await inInertTree(f.pageButton)).toBe(false)
    expect(await inInertTree(f.mountToggle)).toBe(false)
    expect(
      await inInertTree(page.getByTestId('presence-headless-dialog-trigger')),
    ).toBe(false)
    expect(errors).toEqual([])
  })

  test('axe reports no violations while open, mid-exit, and after unmount', async ({
    page,
  }) => {
    // Two hosts x three scans with a long exit so the mid-exit scan is stable.
    test.setTimeout(90_000)
    await setThemedExit(page, 4000)
    const f = fixtures(page)
    const scan = () =>
      new AxeBuilder({ page })
        .include('[data-testid="presence-reference"]')
        .analyze()

    for (const [trigger, content] of [
      [f.dialogTrigger, f.dialogContent],
      [f.popoverTrigger, f.popoverContent],
    ] as const) {
      await trigger.click()
      await expect(content).toHaveAttribute('data-state', 'open')
      await settled(content)
      expect((await scan()).violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(content).toHaveAttribute('inert', '')
      expect((await scan()).violations).toEqual([])
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(content).toHaveCount(0, { timeout: 10_000 })
      expect((await scan()).violations).toEqual([])
    }
  })

  test('surface infinite animations never block removal; finite repeats run to completion', async ({
    page,
  }) => {
    await page.addStyleTag({
      content: `
        @keyframes presence-pulse { 50% { outline-offset: 4px; } }
        @keyframes presence-exit-fade { to { opacity: 0; } }
        .presence-infinite { animation: presence-pulse 1s infinite; }
        .presence-repeat[data-state='closed'] {
          animation: presence-exit-fade 100ms 3;
        }
      `,
    })

    for (const [trigger, content] of [
      ['presence-headless-dialog-trigger', 'presence-headless-dialog-content'],
      [
        'presence-headless-popover-trigger',
        'presence-headless-popover-content',
      ],
    ] as const) {
      const surface = page.getByTestId(content)

      await page.getByTestId(trigger).click()
      await expect(surface).toBeVisible()
      await surface.evaluate((element) => {
        element.classList.add('presence-infinite')
      })
      await page.keyboard.press('Escape')
      // Removed in the close flush: the infinite animation is never awaited.
      expect(
        await page.evaluate(
          (id) => document.querySelector(`[data-testid="${id}"]`),
          content,
        ),
      ).toBeNull()

      await page.getByTestId(trigger).click()
      await expect(surface).toBeVisible()
      await surface.evaluate((element) => {
        element.classList.add('presence-repeat')
      })
      await page.keyboard.press('Escape')
      const midway = await surface.evaluate(
        (element) =>
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(element.isConnected)
            }, 150)
          }),
      )
      expect(midway).toBe(true)
      await expect(surface).toHaveCount(0)
    }
  })

  test('GhostPresence keeps a standalone panel through its exit and reports completion', async ({
    page,
  }) => {
    const toggle = page.getByTestId('presence-panel-toggle')
    const panel = page.getByTestId('presence-panel')
    await toggle.click()
    await expect(panel).toHaveAttribute('data-state', 'open')
    await toggle.click()
    expect(await snapshot(panel)).toMatchObject({
      state: 'closed',
      inert: true,
      pointerEvents: 'none',
    })
    await expect(panel).toHaveCount(0)
    await expect(page.getByTestId('presence-panel-exits')).toHaveText('1')
  })
})
