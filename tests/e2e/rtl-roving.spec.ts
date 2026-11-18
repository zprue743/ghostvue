import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/**
 * RTL acceptance for horizontal roving controls (GHO-54). Runs in Chromium,
 * Firefox, and WebKit (`@cross-browser`).
 *
 * Each case flips the whole document to `dir="rtl"` after the example mounts:
 * every control resolves direction from the nearest `[dir]` at keydown, so
 * layout and arrow mapping must flip together. The assertions check the
 * rendered geometry (DOM order runs right-to-left), real DOM focus, and the ARIA
 * state that follows focus, never `tabindex` alone.
 */

async function setDocumentDir(page: Page, dir: 'ltr' | 'rtl'): Promise<void> {
  await page.evaluate((value) => {
    document.documentElement.dir = value
  }, dir)
}

/** Asserts DOM-ordered items are laid out right-to-left on one row. */
async function expectRightToLeft(items: readonly Locator[]): Promise<void> {
  const boxes = await Promise.all(items.map((item) => item.boundingBox()))
  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1]
    const current = boxes[index]
    expect(previous, `item ${String(index - 1)} box`).not.toBeNull()
    expect(current, `item ${String(index)} box`).not.toBeNull()
    if (!previous || !current) return
    // The next item in DOM order ends at or before the previous one starts.
    expect(current.x + current.width).toBeLessThanOrEqual(previous.x + 0.5)
    // Same row: vertical centers line up within a pixel.
    expect(
      Math.abs(
        current.y + current.height / 2 - (previous.y + previous.height / 2),
      ),
    ).toBeLessThan(1)
  }
}

test.describe('RTL horizontal roving @cross-browser', () => {
  test('GhostTabs mirrors arrows and selects with focus in RTL', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=tabs/basic`)
      const profile = page.getByRole('tab', { name: 'Profile' })
      const billing = page.getByRole('tab', { name: 'Billing' })
      const security = page.getByRole('tab', { name: 'Security' })
      await expect(profile).toBeVisible()
      await setDocumentDir(page, 'rtl')
      await expectRightToLeft([profile, billing, security])

      await profile.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(billing).toBeFocused()
      await expect(billing).toHaveAttribute('aria-selected', 'true')
      await expect(
        page.getByRole('tabpanel', { name: 'Billing' }),
      ).toBeVisible()

      await page.keyboard.press('ArrowLeft')
      await expect(security).toBeFocused()
      await expect(security).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('ArrowRight')
      await expect(billing).toBeFocused()
      await expect(billing).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('Home')
      await expect(profile).toBeFocused()
      await expect(profile).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('End')
      await expect(security).toBeFocused()
      await expect(security).toHaveAttribute('aria-selected', 'true')
    } finally {
      await playground.close()
    }
  })

  test('GhostToggleGroup mirrors arrows in RTL without changing pressed state', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=toggle-group/basic`)
      const compact = page.getByRole('button', { name: 'Compact' })
      const comfortable = page.getByRole('button', { name: 'Comfortable' })
      const spacious = page.getByRole('button', { name: 'Spacious' })
      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
      await setDocumentDir(page, 'rtl')
      await expectRightToLeft([compact, comfortable, spacious])

      await comfortable.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(spacious).toBeFocused()
      // Toggle groups move focus only; pressing stays an explicit action.
      await expect(spacious).toHaveAttribute('aria-pressed', 'false')
      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')

      await page.keyboard.press('ArrowRight')
      await expect(comfortable).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(compact).toBeFocused()

      await page.keyboard.press('Space')
      await expect(compact).toHaveAttribute('aria-pressed', 'true')
      await expect(comfortable).toHaveAttribute('aria-pressed', 'false')
    } finally {
      await playground.close()
    }
  })

  test('useGhostToolbar mirrors arrows and keeps one Tab stop in RTL', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=toolbar/composable`)
      const toolbar = page.getByTestId('toolbar-composable')
      const all = toolbar.getByRole('button', { name: 'All' })
      const open = toolbar.getByRole('button', { name: 'Open' })
      const closed = toolbar.getByRole('button', { name: 'Closed' })
      await expect(all).toBeVisible()
      await setDocumentDir(page, 'rtl')
      await expectRightToLeft([all, open, closed])

      await all.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(open).toBeFocused()
      await page.keyboard.press('End')
      await expect(closed).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(open).toBeFocused()
      await page.keyboard.press('Home')
      await expect(all).toBeFocused()

      // Roving tabindex: the toolbar is a single Tab stop, so Shift+Tab from
      // inside leaves the toolbar instead of visiting another item.
      await page.keyboard.press('ArrowLeft')
      await expect(open).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(all).not.toBeFocused()
      await expect(open).not.toBeFocused()
      await expect(closed).not.toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('GhostMenubar mirrors arrows between closed triggers in RTL', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=menubar/basic`)
      const menubar = page.getByRole('menubar')
      const file = menubar.getByRole('menuitem', { name: 'File' })
      const edit = menubar.getByRole('menuitem', { name: 'Edit' })
      await expect(file).toBeVisible()
      await setDocumentDir(page, 'rtl')
      await expectRightToLeft([file, edit])

      await file.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(edit).toBeFocused()
      await expect(edit).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('ArrowRight')
      await expect(file).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('GhostRadioGroup native radios move and select in RTL, with the WebKit arrow mapping', async ({
    page,
    browserName,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=radio-group/themed`)
      const compact = page.getByRole('radio', { name: 'Compact' })
      const comfortable = page.getByRole('radio', { name: 'Comfortable' })
      const spacious = page.getByRole('radio', { name: 'Spacious' })
      await expect(comfortable).toBeChecked()
      await setDocumentDir(page, 'rtl')
      await expectRightToLeft([compact, comfortable, spacious])

      // Arrow keys on native radios are handled by the browser, which moves
      // focus and checks together. ArrowDown/ArrowUp mean next/previous in DOM
      // order in every engine and every direction.
      await comfortable.focus()
      await page.keyboard.press('ArrowDown')
      await expect(spacious).toBeFocused()
      await expect(spacious).toBeChecked()
      await page.keyboard.press('ArrowUp')
      await expect(comfortable).toBeFocused()
      await expect(comfortable).toBeChecked()

      // Horizontal arrows: Chromium and Firefox mirror them in RTL (ArrowLeft
      // is visually "next"); WebKit does not, so ArrowRight always means next
      // in DOM order. GhostRadioGroup is native-only by design (see the radio
      // group spec), so this engine difference is documented, not patched.
      const mirrored = browserName !== 'webkit'
      await page.keyboard.press('ArrowLeft')
      const afterLeft = mirrored ? spacious : compact
      await expect(afterLeft).toBeFocused()
      await expect(afterLeft).toBeChecked()
      await expect(comfortable).not.toBeChecked()

      await page.keyboard.press('ArrowRight')
      await expect(comfortable).toBeFocused()
      await expect(comfortable).toBeChecked()
    } finally {
      await playground.close()
    }
  })
})
