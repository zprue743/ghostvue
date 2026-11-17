import { expect, test, type CDPSession, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/**
 * GHO-167 regression: keys that belong to an active IME composition (candidate
 * navigation, confirmation, cancellation, composed characters) must not drive
 * Combobox, Select listbox, or menu keyboard behavior.
 *
 * Chromium-only: composition is driven through the DevTools protocol
 * (`Input.imeSetComposition` / `Input.insertText`), which dispatches trusted
 * `compositionstart`/`compositionupdate`/`compositionend` and `input` events,
 * and keys pressed while it is active arrive with `isComposing === true`.
 * WebKit's ordering (compositionend before the confirming keydown, which then
 * reports `isComposing === false` and `keyCode === 229`) is reproduced with a
 * trusted `Input.dispatchKeyEvent` carrying virtual key code 229. Real input
 * method editors and Safari/Firefox still need the manual pass documented in
 * the Combobox, Select, and Dropdown Menu pages.
 */

interface RecordedKey {
  readonly key: string
  readonly keyCode: number
  readonly composing: boolean
  readonly prevented: boolean
}

declare global {
  interface Window {
    __imeKeys?: RecordedKey[]
  }
}

/**
 * Records every keydown after component handlers ran (bubble phase on
 * `window`), so the assertions can check that IME-owned keys were neither
 * prevented nor swallowed before reaching consumer listeners.
 */
async function recordKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__imeKeys = []
    window.addEventListener('keydown', (event) => {
      window.__imeKeys?.push({
        key: event.key,
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- asserting the WebKit IME compatibility signal.
        keyCode: event.keyCode,
        composing: event.isComposing,
        prevented: event.defaultPrevented,
      })
    })
  })
}

async function takeKeys(page: Page): Promise<RecordedKey[]> {
  return page.evaluate(() => {
    const keys = window.__imeKeys ?? []
    window.__imeKeys = []
    return keys
  })
}

const VIRTUAL_KEY_CODES: Record<string, number> = {
  Enter: 13,
  Escape: 27,
  ' ': 32,
  ArrowUp: 38,
  ArrowDown: 40,
}

/**
 * Trusted keydown/keyup that reports `keyCode === 229` with the physical
 * `key`, matching WebKit's keydown for a key consumed by the IME.
 */
async function pressImeProcessedKey(
  cdp: CDPSession,
  key: string,
): Promise<void> {
  const code =
    key.length === 1 && key !== ' '
      ? `Key${key.toUpperCase()}`
      : key === ' '
        ? 'Space'
        : key
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key,
    code,
    windowsVirtualKeyCode: 229,
  })
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode:
      VIRTUAL_KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0),
  })
}

test.describe('IME composition (GHO-167)', () => {
  test('Combobox leaves composing ArrowUp/Down, Enter, Escape, and characters to the IME', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const cdp = await page.context().newCDPSession(page)

      const input = page.getByTestId('combobox-demo-input')
      const content = page.getByTestId('combobox-demo-content')
      await input.scrollIntoViewIfNeeded()
      await input.focus()
      await expect(input).toBeFocused()
      await input.fill('')
      await recordKeys(page)

      // Composition text arrives through real input events: the combobox
      // filters on it (search state) and opens, like ordinary typing.
      await cdp.send('Input.imeSetComposition', {
        text: '5',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await expect(input).toHaveValue('5')
      await expect(content).toBeVisible()
      await expect(input).toHaveAttribute('aria-expanded', 'true')
      const activeBefore = await input.getAttribute('aria-activedescendant')

      for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
        await page.keyboard.press(key)
        await expect(content, key).toBeVisible()
        await expect(input, key).toHaveAttribute('aria-expanded', 'true')
        await expect(input, key).toBeFocused()
        if (activeBefore === null) {
          await expect(input, key).not.toHaveAttribute('aria-activedescendant')
        } else {
          await expect(input, key).toHaveAttribute(
            'aria-activedescendant',
            activeBefore,
          )
        }
      }

      const composingKeys = await takeKeys(page)
      expect(composingKeys.map(({ key }) => key)).toEqual([
        'ArrowDown',
        'ArrowUp',
        'Enter',
        'Escape',
      ])
      for (const recorded of composingKeys) {
        expect(recorded.composing, recorded.key).toBe(true)
        expect(recorded.prevented, recorded.key).toBe(false)
      }

      // Commit the composition. WebKit then dispatches the confirming Enter
      // after compositionend with keyCode 229; it must not select an option.
      await cdp.send('Input.insertText', { text: '5' })
      await expect(input).toHaveValue('5')
      await pressImeProcessedKey(cdp, 'Enter')
      await pressImeProcessedKey(cdp, 'ArrowDown')
      await pressImeProcessedKey(cdp, 'Escape')
      await expect(content).toBeVisible()
      await expect(input).toHaveValue('5')
      const processedKeys = await takeKeys(page)
      expect(processedKeys.map(({ key }) => key)).toEqual([
        'Enter',
        'ArrowDown',
        'Escape',
      ])
      for (const recorded of processedKeys) {
        expect(recorded.composing, recorded.key).toBe(false)
        expect(recorded.keyCode, recorded.key).toBe(229)
        expect(recorded.prevented, recorded.key).toBe(false)
      }

      // After compositionend, ordinary keys resume combobox behavior.
      const option50 = page.getByRole('option', { name: '50 rows' })
      const option50Id = await option50.getAttribute('id')
      // The '5' filter leaves 25 and 50 rows; End highlights the last one.
      await page.keyboard.press('End')
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        option50Id ?? '',
      )
      await page.keyboard.press('Enter')
      await expect(content).toBeHidden()
      await expect(input).toHaveValue('50 rows')
      await expect(input).toBeFocused()

      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(input).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('Select listbox ignores IME-processed keys and resumes typeahead afterwards', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const cdp = await page.context().newCDPSession(page)

      const trigger = page.getByTestId('select-demo-trigger')
      const content = page.getByTestId('select-demo-content')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()

      const option10 = content.getByRole('option', { name: '10 rows' })
      const option50 = content.getByRole('option', { name: '50 rows' })
      await option10.focus()
      await expect(option10).toBeFocused()
      await recordKeys(page)

      for (const key of ['5', 'ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape']) {
        await pressImeProcessedKey(cdp, key)
        await expect(content, key).toBeVisible()
        await expect(option10, key).toBeFocused()
      }
      await expect(trigger).toContainText('25 rows')
      for (const recorded of await takeKeys(page)) {
        expect(recorded.keyCode, recorded.key).toBe(229)
        expect(recorded.prevented, recorded.key).toBe(false)
      }

      await page.keyboard.press('5')
      await expect(option50).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(content).toBeHidden()
      await expect(trigger).toContainText('50 rows')
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('Dropdown menu ignores IME-processed keys and resumes typeahead afterwards', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      const cdp = await page.context().newCDPSession(page)

      const trigger = page.getByTestId('dropdown-basic-trigger')
      const content = page.getByTestId('dropdown-basic-content')
      const editItem = page.getByTestId('dropdown-basic-item-edit')
      const checkbox = page.getByTestId('dropdown-checkbox-item')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      await expect(editItem).toBeFocused()
      await recordKeys(page)

      for (const key of ['s', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
        await pressImeProcessedKey(cdp, key)
        await expect(content, key).toBeVisible()
        await expect(editItem, key).toBeFocused()
      }
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      for (const recorded of await takeKeys(page)) {
        expect(recorded.keyCode, recorded.key).toBe(229)
        expect(recorded.prevented, recorded.key).toBe(false)
      }

      await page.keyboard.press('s')
      await expect(checkbox).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
