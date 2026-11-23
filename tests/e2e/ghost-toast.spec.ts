import type { Page } from '@playwright/test'

import { waitForExamplePreview } from '../support'
import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

async function openExample(page: Page, playgroundUrl: string, id: string) {
  await page.goto(`${playgroundUrl}/examples.html?id=${encodeURIComponent(id)}`)
  await expect(page.locator('[data-part="viewport"]')).toBeAttached()
}

function toasts(page: Page) {
  return page.locator('[data-ghost-toast]')
}

test.describe('GhostToast @component:GhostToast', () => {
  test('shows a toast from a nested component without moving focus and announces it politely', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'toast/basic')
    const region = page.getByRole('region', { name: 'Notifications' })
    await expect(region).toHaveAttribute('data-ghost-live', '')
    await expectNoAxeViolations(page)

    const save = page.getByRole('button', { name: 'Save draft' })
    await save.focus()
    await page.keyboard.press('Enter')
    await expect(toasts(page)).toHaveCount(1)
    await expect(save).toBeFocused()
    await expect(region).toContainText('Draft saved')
    await expect(page.locator('[data-part="announcer-polite"]')).toHaveText(
      'Draft saved Your changes are stored in this workspace.',
    )
    await expect(page.locator('[data-part="announcer-assertive"]')).toHaveText(
      '',
    )
    await expectNoAxeViolations(page)
  })

  test('auto-dismisses after eight seconds and pauses while hovered', async ({
    page,
    playgroundUrl,
  }) => {
    await page.clock.install()
    await openExample(page, playgroundUrl, 'toast/basic')
    await page.getByRole('button', { name: 'Save draft' }).click()
    const toast = toasts(page).first()
    await expect(toast).toBeVisible()

    await toast.hover()
    await page.clock.runFor(20_000)
    await expect(toast).toBeVisible()

    await page.mouse.move(0, 0)
    await page.clock.runFor(7_000)
    await expect(toast).toBeVisible()
    await page.clock.runFor(1_100)
    await expect(toasts(page)).toHaveCount(0)
  })

  test('pauses while the page is hidden and resumes when visible', async ({
    page,
    playgroundUrl,
  }) => {
    await page.clock.install()
    await openExample(page, playgroundUrl, 'toast/basic')
    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(toasts(page)).toHaveCount(1)
    await page.mouse.move(0, 0)

    const setVisibility = (state: 'hidden' | 'visible') =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => value,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      }, state)

    await page.clock.runFor(2_000)
    await setVisibility('hidden')
    await page.clock.runFor(60_000)
    await expect(toasts(page)).toHaveCount(1)

    await setVisibility('visible')
    await page.clock.runFor(5_000)
    await expect(toasts(page)).toHaveCount(1)
    await page.clock.runFor(1_100)
    await expect(toasts(page)).toHaveCount(0)
  })

  test('keeps three visible, tabs through close buttons, and returns focus on Enter, Space, and Escape', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'toast/queue-overflow')
    const dismissAll = page.getByRole('button', { name: 'Dismiss all' })
    await page.getByRole('button', { name: 'Finish five builds' }).click()
    await expect(toasts(page)).toHaveCount(3)
    await expect(toasts(page).first()).toContainText('Build api finished')
    await expectNoAxeViolations(page)

    // Enter on Close: dismisses, promotes the next build, restores focus.
    await dismissAll.focus()
    await page.keyboard.press('Tab')
    const firstClose = page.getByRole('button', {
      name: 'Dismiss: Build api finished',
    })
    await expect(firstClose).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Dismiss: Build docs finished' }),
    ).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(firstClose).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(toasts(page)).toHaveCount(3)
    await expect(toasts(page).last()).toContainText('Build worker finished')
    await expect(dismissAll).toBeFocused()
    await expect(page.locator('[data-part="announcer-polite"]')).toHaveText(
      'Build worker finished All checks passed.',
    )

    // Space on Close.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(toasts(page).last()).toContainText('Build mobile finished')
    await expect(dismissAll).toBeFocused()

    // Escape anywhere in a toast dismisses only that toast.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Escape')
    await expect(toasts(page)).toHaveCount(2)
    await expect(dismissAll).toBeFocused()

    await dismissAll.click()
    await expect(toasts(page)).toHaveCount(0)
  })

  test('stays operable above an open modal dialog: Escape closes only the toast (T5)', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'toast/persist-error')
    await page.getByRole('button', { name: 'Edit release notes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Release notes' })
    await expect(dialog).toBeVisible()
    const publish = dialog.getByRole('button', { name: 'Publish' })
    await publish.click()

    const region = page.getByRole('region', { name: 'Notifications' })
    await expect(region).toContainText('Publish failed')
    await expect(region).not.toHaveAttribute('inert', /.*/)
    // Urgent: assertive region only.
    await expect(page.locator('[data-part="announcer-assertive"]')).toHaveText(
      'Publish failed The server did not respond. Nothing was published.',
    )
    await expect(page.locator('[data-part="announcer-polite"]')).toHaveText('')
    await expect(publish).toBeFocused()
    await expectNoAxeViolations(page)

    // Error toasts persist; the user moves into the stack and presses Escape.
    const retry = region.getByRole('button', { name: 'Retry' })
    await retry.focus()
    await expect(retry).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(toasts(page)).toHaveCount(0)
    await expect(dialog).toBeVisible()
    await expect(publish).toBeFocused()

    // Pressing a toast button is not an outside press for the dialog.
    await publish.click()
    await region.getByRole('button', { name: 'Retry' }).click()
    await expect(dialog).toBeVisible()
    await expect(region).toContainText('Published')
    await expect(page.locator('[data-part="announcer-polite"]')).toHaveText(
      'Published Release notes are live.',
    )

    // Close on the success toast returns focus into the dialog.
    await publish.focus()
    const close = region.getByRole('button', { name: 'Dismiss' })
    await close.focus()
    await page.keyboard.press('Enter')
    await expect(toasts(page)).toHaveCount(0)
    await expect(publish).toBeFocused()
    await expect(dialog).toBeVisible()
  })
})

test.describe('themed GhostToast @component:GhostToast', () => {
  test('renders the themed corner stack without moving focus and keeps headless keyboard behavior', async ({
    page,
    playgroundUrl,
  }) => {
    await openExample(page, playgroundUrl, 'toast/themed')
    const region = page.getByRole('region', { name: 'Notifications' })
    await expect(region).toHaveAttribute('data-themed', '')
    await expect(region).toHaveCSS('position', 'fixed')
    await expectNoAxeViolations(page)

    const save = page.getByRole('button', { name: 'Save draft' })
    const sync = page.getByRole('button', { name: 'Sync files' })
    await save.focus()
    await page.keyboard.press('Enter')
    await sync.focus()
    await page.keyboard.press('Space')
    await expect(toasts(page)).toHaveCount(2)
    await expect(sync).toBeFocused()
    await expect(toasts(page).last()).toHaveAttribute('data-tone', 'danger')
    await expect(page.locator('[data-part="announcer-polite"]')).toHaveText(
      'Sync failed Three files could not be uploaded.',
    )
    await expectNoAxeViolations(page)

    // Tab order: the page controls, then the stack, oldest toast first.
    await page.keyboard.press('Tab')
    const firstClose = toasts(page)
      .first()
      .getByRole('button', { name: 'Dismiss' })
    await expect(firstClose).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(region.getByRole('button', { name: 'Retry' })).toBeFocused()

    // Escape dismisses only the focused toast and returns focus.
    await page.keyboard.press('Escape')
    await expect(toasts(page)).toHaveCount(1)
    await expect(sync).toBeFocused()

    // Enter on the icon close dismisses through the store.
    await page.keyboard.press('Tab')
    await expect(firstClose).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(toasts(page)).toHaveCount(0)
    await expect(sync).toBeFocused()
  })

  test('plays the enter animation once and not again on an in-place update (T7)', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openExample(page, playgroundUrl, 'toast/themed')
    await page.getByRole('button', { name: 'Sync files' }).click()
    const toast = toasts(page).first()
    await expect(toast).toHaveCSS('animation-name', 'ghost-toast-enter')

    // Remember the element and its animation, then let the animation finish.
    await toast.evaluate(async (element) => {
      const [animation] = element.getAnimations()
      if (!animation) throw new Error('no enter animation')
      await animation.finished
      Object.assign(window, { __toastEl: element, __toastAnim: animation })
    })

    await toast.getByRole('button', { name: 'Retry' }).click()
    await expect(toast).toContainText('Still failing')
    await expect(toast).toHaveAttribute('data-tone', 'danger')

    const replay = await toast.evaluate((element) => {
      const state = window as unknown as {
        __toastEl?: Element
        __toastAnim?: Animation
      }
      const running = element
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
      return {
        sameElement: state.__toastEl === element,
        sameAnimation: element.getAnimations()[0] === state.__toastAnim,
        running: running.length,
      }
    })
    expect(replay).toEqual({
      sameElement: true,
      sameAnimation: true,
      running: 0,
    })
  })

  test('has no animation under prefers-reduced-motion', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openExample(page, playgroundUrl, 'toast/themed')
    await page.getByRole('button', { name: 'Save draft' }).click()
    const toast = toasts(page).first()
    await expect(toast).toBeVisible()
    await expect(toast).toHaveCSS('animation-name', 'none')
    expect(
      await toast.evaluate((element) => element.getAnimations().length),
    ).toBe(0)
  })
})

test.describe('toast/themed stack', { tag: ['@visual'] }, () => {
  test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })

  test('toast/themed stack matches snapshots in light and dark', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Informational toasts would auto-dismiss mid-run without a frozen clock.
    await page.clock.install()
    for (const mode of ['light', 'dark'] as const) {
      await waitForExamplePreview(page, playgroundUrl, 'toast/themed', {
        mode,
      })
      await page.evaluate(() => document.fonts.ready)
      await page.getByRole('button', { name: 'Save draft' }).click()
      await page.getByRole('button', { name: 'Sync files' }).click()
      const region = page.getByRole('region', { name: 'Notifications' })
      await expect(toasts(page)).toHaveCount(2)
      await page.mouse.move(0, 0)
      await expect(region).toHaveScreenshot(`toast-themed-stack-${mode}.png`)
    }
  })
})
