import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/**
 * GHO-168 regression: composites built on the shared `useRovingFocus` helper
 * must leave Alt/Ctrl/Meta navigation chords to the browser, OS, assistive
 * technology, or app. Each case asserts that real focus, roving tab stops, and
 * `defaultPrevented` stay unchanged for modified arrows/Home/End, then that the
 * documented unmodified (and Shift-modified) keys still move focus.
 */

const MODIFIERS = ['Alt', 'Control', 'Meta'] as const

interface RecordedKey {
  readonly combo: string
  readonly prevented: boolean
}

declare global {
  interface Window {
    __rovingModifiedKeys?: RecordedKey[]
  }
}

/**
 * Records whether each modified keydown reached `window` already prevented.
 * Component listeners run on the composite during bubbling, so they have
 * finished by the time this window listener sees the event. After recording,
 * the listener prevents the default itself so headless Chromium does not act
 * on chords such as Alt+ArrowLeft (history back) and navigate the fixture away.
 */
async function recordModifiedKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__rovingModifiedKeys = []
    window.addEventListener('keydown', (event) => {
      const modifierOnly = ['Alt', 'Control', 'Meta', 'Shift'].includes(
        event.key,
      )
      if (modifierOnly || (!event.altKey && !event.ctrlKey && !event.metaKey)) {
        return
      }
      const parts = [
        event.altKey ? 'Alt' : '',
        event.ctrlKey ? 'Control' : '',
        event.metaKey ? 'Meta' : '',
        event.key,
      ].filter(Boolean)
      window.__rovingModifiedKeys?.push({
        combo: parts.join('+'),
        prevented: event.defaultPrevented,
      })
      event.preventDefault()
    })
  })
}

async function tabIndexes(items: Locator): Promise<number[]> {
  return items.evaluateAll((nodes) =>
    nodes.map((node) => (node instanceof HTMLElement ? node.tabIndex : NaN)),
  )
}

async function expectModifiedKeysIgnored(
  page: Page,
  focused: Locator,
  items: Locator,
  keys: readonly string[],
): Promise<void> {
  await focused.focus()
  await expect(focused).toBeFocused()
  const before = await tabIndexes(items)

  const pressed: string[] = []
  for (const modifier of MODIFIERS) {
    for (const key of keys) {
      const combo = `${modifier}+${key}`
      pressed.push(combo)
      await page.keyboard.press(combo)
      await expect(focused).toBeFocused()
    }
  }

  expect(await tabIndexes(items)).toEqual(before)
  const recorded = await page.evaluate(() => window.__rovingModifiedKeys ?? [])
  expect(recorded.map((entry) => entry.combo)).toEqual(pressed)
  expect(recorded.filter((entry) => entry.prevented)).toEqual([])
}

const HORIZONTAL_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'] as const
const VERTICAL_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'] as const

test.describe('useRovingFocus modified navigation shortcuts', () => {
  test('GhostTabs keeps focus and selection for modified keys', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=tabs/basic`)
      const tabs = page.getByRole('tab')
      const billing = page.getByRole('tab', { name: 'Billing' })
      await billing.click()
      await expect(billing).toHaveAttribute('aria-selected', 'true')
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, billing, tabs, HORIZONTAL_KEYS)
      // Automatic activation follows focus, so selection must not move either.
      await expect(billing).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('ArrowRight')
      const security = page.getByRole('tab', { name: 'Security' })
      await expect(security).toBeFocused()
      await expect(security).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('Home')
      await expect(page.getByRole('tab', { name: 'Profile' })).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('GhostToolbar keeps focus for modified keys', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(playground.url)
      const toolbar = page.getByTestId('toolbar-horizontal')
      const items = toolbar.getByRole('button')
      const duplicate = toolbar.getByRole('button', { name: 'Duplicate row' })
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, duplicate, items, HORIZONTAL_KEYS)

      await page.keyboard.press('ArrowRight')
      await expect(
        toolbar.getByRole('button', { name: 'Archive row' }),
      ).toBeFocused()
      await page.keyboard.press('Shift+ArrowLeft')
      await expect(duplicate).toBeFocused()
      await page.keyboard.press('Home')
      await expect(
        toolbar.getByRole('button', { name: 'Edit row' }),
      ).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('GhostToggleGroup keeps focus and pressed state for modified keys', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=toggle-group/basic`)
      const group = page.getByRole('group', { name: 'Row density' })
      const items = group.getByRole('button')
      const comfortable = group.getByRole('button', { name: 'Comfortable' })
      const compact = group.getByRole('button', { name: 'Compact' })
      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, comfortable, items, HORIZONTAL_KEYS)
      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')

      await page.keyboard.press('ArrowLeft')
      await expect(compact).toBeFocused()
      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
    } finally {
      await playground.close()
    }
  })

  test('GhostSegmentedControl keeps focus and selection for modified keys', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/basic`,
      )
      const group = page.getByRole('group', { name: 'Content view' })
      const items = group.getByRole('button')
      const list = group.getByRole('button', { name: 'List' })
      await expect(list).toHaveAttribute('aria-pressed', 'true')
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, list, items, HORIZONTAL_KEYS)
      await expect(list).toHaveAttribute('aria-pressed', 'true')

      await page.keyboard.press('End')
      await expect(group.getByRole('button', { name: 'Board' })).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('RTL roving fixture keeps flipped arrows and ignores modified keys @cross-browser', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(playground.url)
      const toolbar = page.getByTestId('roving-rtl')
      const items = toolbar.getByRole('button')
      const rightmost = toolbar.getByRole('button', { name: 'Rightmost' })
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, rightmost, items, HORIZONTAL_KEYS)

      // In RTL, ArrowLeft moves to the next item in DOM order.
      await page.keyboard.press('ArrowLeft')
      await expect(
        toolbar.getByRole('button', { name: 'Middle' }),
      ).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(rightmost).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('GhostSelect listbox keeps the active option for modified keys', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(playground.url)
      const trigger = page.getByTestId('select-demo-trigger')
      const content = page.getByTestId('select-demo-content')
      await trigger.scrollIntoViewIfNeeded()
      // Keyboard open moves focus to the selected option per the Select spec.
      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()

      const options = content.getByRole('option')
      const selected = content.getByRole('option', { name: '25 rows' })
      // Focus the option directly so this case isolates the listbox roving
      // handler from the trigger's open-focus behavior.
      await selected.focus()
      await expect(selected).toBeFocused()
      await recordModifiedKeys(page)

      await expectModifiedKeysIgnored(page, selected, options, VERTICAL_KEYS)
      await expect(content).toBeVisible()

      await page.keyboard.press('ArrowDown')
      await expect(
        content.getByRole('option', { name: '50 rows' }),
      ).toBeFocused()
      await page.keyboard.press('Home')
      await expect(
        content.getByRole('option', { name: '10 rows' }),
      ).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
