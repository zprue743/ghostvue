import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'

import { waitForExamplePreview } from '../support'
import { playgroundTest as test, expect } from '../support/playground'

const tag = '@component:GhostCommandPalette'

async function axe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

/** Asserts the input's active descendant is the option with `name`. */
async function expectActive(
  page: Page,
  input: Locator,
  name: string,
): Promise<void> {
  const option = page.getByRole('option', { name, exact: true })
  await expect(option).toHaveAttribute('aria-selected', 'true')
  const id = await option.getAttribute('id')
  expect(id).toBeTruthy()
  await expect(input).toHaveAttribute('aria-activedescendant', id ?? '')
}

test.describe('GhostCommandPalette', { tag }, () => {
  test('command-palette/basic: keyboard-only activation, grouped labels, Tab trap, empty state, focus restore, and axe', async ({
    page,
    playgroundUrl,
  }) => {
    await waitForExamplePreview(page, playgroundUrl, 'command-palette/basic')
    const trigger = page.getByRole('button', { name: 'Open command palette' })
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    await axe(page)

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const input = page.getByRole('combobox', { name: 'Command palette' })
    const listbox = page.getByRole('listbox')
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute('aria-expanded', 'true')
    await expect(input).toHaveAttribute(
      'aria-controls',
      (await listbox.getAttribute('id')) ?? '',
    )
    await expect(page.getByRole('group', { name: 'Navigation' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Actions' })).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Go to billing' }),
    ).toHaveAttribute('aria-disabled', 'true')
    await axe(page)

    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Go to dashboard')
    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Go to issues')
    // Disabled "Go to billing" is skipped; the separator is never a stop.
    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Create issue')
    await page.keyboard.press('ArrowUp')
    await expectActive(page, input, 'Go to issues')
    await page.keyboard.press('End')
    await expectActive(page, input, 'Invite teammate')
    await page.keyboard.press('Home')
    await expectActive(page, input, 'Go to dashboard')
    await expect(input).toBeFocused()

    // The input is the only tabbable element; Tab stays in the modal.
    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(input).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page.locator('output')).toHaveText('Go to dashboard')
    await expect(trigger).toBeFocused()

    // Reopen: the query was reset on close and nothing stays selected.
    await page.keyboard.press('Enter')
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('')
    await expect(input).not.toHaveAttribute('aria-activedescendant')

    await input.pressSequentially('zzz')
    await expect(page.getByText('No commands found.')).toBeVisible()
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(page.locator('[data-part="announcer"]')).toHaveText(
      'No results available',
    )
    await axe(page)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(page.locator('output')).toHaveText('Go to dashboard')
  })

  test('command-palette/basic: pointer activation and overlay dismissal', async ({
    page,
    playgroundUrl,
  }) => {
    await waitForExamplePreview(page, playgroundUrl, 'command-palette/basic')
    const trigger = page.getByRole('button', { name: 'Open command palette' })
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    const input = page.getByRole('combobox')

    await trigger.click()
    await expect(input).toBeFocused()
    // Disabled items ignore presses (force skips Playwright's enabled check).
    await page
      .getByRole('option', { name: 'Go to billing' })
      .click({ force: true })
    await expect(dialog).toBeVisible()
    await expect(input).toBeFocused()
    await page.getByRole('option', { name: 'Create issue' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('output')).toHaveText('Create issue')
    await expect(trigger).toBeFocused()

    await trigger.click()
    await expect(dialog).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('command-palette/async: loading announcement and out-of-order responses', async ({
    page,
    playgroundUrl,
  }) => {
    await waitForExamplePreview(page, playgroundUrl, 'command-palette/async')
    await page.getByRole('button', { name: 'Search pages' }).click()
    const input = page.getByRole('combobox', { name: 'Search pages' })
    await expect(input).toBeFocused()
    await expect(page.getByRole('option')).toHaveCount(6)

    // "r" answers in 280 ms and "re" in 160 ms: the stale "r" response
    // arrives last and must be ignored.
    await input.pressSequentially('re', { delay: 10 })
    await expect(page.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')
    await expect(page.locator('[data-part="announcer"]')).toHaveText(
      'Loading results',
    )
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(page.getByRole('listbox')).not.toHaveAttribute('aria-busy')
    await page.waitForTimeout(400)
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(
      page.getByRole('option', { name: 'Release notes' }),
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: 'Sprint retro' }),
    ).toBeVisible()
    await expect(page.locator('[data-part="announcer"]')).toHaveText(
      '2 results available',
    )
    await axe(page)

    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Release notes')
    await page.keyboard.press('Enter')
    await expect(page.locator('output')).toHaveText('Release notes')
  })

  test('command-palette/shortcut: Mod+K opens from a non-trigger opener and restores focus to it', async ({
    page,
    playgroundUrl,
  }) => {
    await waitForExamplePreview(page, playgroundUrl, 'command-palette/shortcut')
    const draft = page.getByRole('textbox', { name: 'Draft' })
    const dialog = page.getByRole('dialog', { name: 'Formatting commands' })
    await axe(page)

    await draft.focus()
    await page.keyboard.press('ControlOrMeta+k')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('combobox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(draft).toBeFocused()

    await page.keyboard.press('ControlOrMeta+k')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(page.locator('output')).toHaveText('Toggle bold')
    await expect(draft).toBeFocused()
  })

  test('command-palette/virtualized: only the mounted slice is navigable', async ({
    page,
    playgroundUrl,
  }) => {
    await waitForExamplePreview(
      page,
      playgroundUrl,
      'command-palette/virtualized',
    )
    await page.getByRole('button', { name: 'Find a record' }).click()
    const input = page.getByRole('combobox')
    await expect(page.getByRole('option')).toHaveCount(50)
    await expect(page.getByText('Showing 50 of 2000 matches.')).toBeVisible()
    await page.keyboard.press('End')
    await expectActive(page, input, 'Open record 0050')
    await input.pressSequentially('1999')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Open record 1999')
    await page.keyboard.press('Enter')
    await expect(page.locator('output')).toHaveText('Open record 1999')
    await axe(page)
  })

  test('modal palette keeps a nested portaled popover usable and stays open (C4, ADR 0012)', async ({
    page,
    playgroundUrl,
  }) => {
    await page.goto(playgroundUrl)
    const trigger = page.getByTestId('palette-nested-trigger')
    const content = page.getByTestId('palette-nested-content')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(content).toBeVisible()
    const input = content.getByRole('combobox')
    await expect(input).toBeFocused()

    await page.keyboard.press('Tab')
    const popoverTrigger = page.getByTestId('palette-popover-trigger')
    await expect(popoverTrigger).toBeFocused()
    await page.keyboard.press('Enter')
    const popover = page.getByTestId('palette-popover-content')
    await expect(popover).toBeVisible()
    await expect(page.getByTestId('palette-popover-input')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('palette-popover-close')).toBeFocused()
    // Focus is outside the dialog root, yet the modal palette stays open.
    await expect(content).toBeVisible()
    await axe(page)

    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
    await expect(content).toBeVisible()
    await expect(popoverTrigger).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(content).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('non-modal palette closes when Tab leaves it, without pulling focus back (C4)', async ({
    page,
    playgroundUrl,
  }) => {
    await page.goto(playgroundUrl)
    const trigger = page.getByTestId('palette-nonmodal-trigger')
    const content = page.getByTestId('palette-nonmodal-content')
    const after = page.getByTestId('palette-after')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(content).toBeVisible()
    await expect(content).not.toHaveAttribute('aria-modal')
    const input = content.getByRole('combobox')
    await expect(input).toBeFocused()
    await input.pressSequentially('pin')

    await page.keyboard.press('Tab')
    await expect(content).toHaveCount(0)
    await expect(after).toBeFocused()

    await trigger.click()
    await expect(content.getByRole('combobox')).toHaveValue('')
    // Like the combobox, the trigger is part of the widget: moving to it is
    // not departure. Leaving past it is.
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()
    await expect(content).toBeVisible()
    await page.keyboard.press('Shift+Tab')
    await expect(content).toHaveCount(0)
    await expect(trigger).not.toBeFocused()
  })

  test('IME composition keys do not move the highlight or activate', async ({
    page,
    playgroundUrl,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Composition is driven through CDP.')
    await waitForExamplePreview(page, playgroundUrl, 'command-palette/basic')
    await page.getByRole('button', { name: 'Open command palette' }).click()
    const input = page.getByRole('combobox')
    await expect(input).toBeFocused()
    const cdp = await page.context().newCDPSession(page)

    await cdp.send('Input.imeSetComposition', {
      text: 'g',
      selectionStart: 1,
      selectionEnd: 1,
    })
    await expect(input).toHaveValue('g')
    for (const key of ['ArrowDown', 'Enter', 'Escape']) {
      await page.keyboard.press(key)
      await expect(input, key).not.toHaveAttribute('aria-activedescendant')
      await expect(page.getByRole('dialog'), key).toBeVisible()
    }
    await cdp.send('Input.insertText', { text: 'g' })
    await page.keyboard.press('ArrowDown')
    await expectActive(page, input, 'Go to dashboard')
    await expect(page.locator('output')).toHaveText('None yet')
  })
})

test.describe('command-palette/themed open', { tag: ['@visual', tag] }, () => {
  test.use({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })

  test('command-palette/themed open palette matches snapshots in light and dark', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const mode of ['light', 'dark'] as const) {
      await waitForExamplePreview(
        page,
        playgroundUrl,
        'command-palette/themed',
        {
          mode,
        },
      )
      await page.evaluate(() => document.fonts.ready)
      await page.getByRole('button', { name: /Search commands/ }).click()
      const dialog = page.getByRole('dialog', { name: 'Commands' })
      await expect(dialog).toBeVisible()
      await page.keyboard.press('ArrowDown')
      await expect(dialog).toHaveScreenshot(
        `command-palette-themed-open-${mode}.png`,
      )
    }
  })
})
