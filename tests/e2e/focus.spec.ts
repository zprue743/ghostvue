import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('focus primitives', { tag: '@cross-browser' }, () => {
  test('traps Tab inside a focus scope and restores on close', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-trap').click()

      await expect(page.getByTestId('trap-first')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-last')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('close-trap')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-first')).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('close-trap')).toBeFocused()

      await page.getByTestId('close-trap').click()
      await expect(page.getByTestId('open-trap')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('recovers focus on outside mouse clicks and programmatic .focus() while trapped', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-trap').click()
      await expect(page.getByTestId('trap-first')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-last')).toBeFocused()

      // Clicking an outside focusable button pulls focus back to the last
      // focused element inside the trapped scope.
      await page.getByTestId('before-roving').click()
      await expect(page.getByTestId('trap-last')).toBeFocused()

      // Programmatic .focus() on an outside control also recovers inside.
      await page.evaluate(() => {
        document
          .querySelector<HTMLElement>('[data-testid="before-roving"]')
          ?.focus()
      })
      await expect(page.getByTestId('trap-last')).toBeFocused()

      await page.getByTestId('close-trap').click()
      await expect(page.getByTestId('open-trap')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('autofocuses the visible tab stop when an earlier candidate is in a hidden subtree', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-trap-hidden').focus()
      await page.getByTestId('open-trap-hidden').click()

      await expect(page.getByTestId('trap-hidden-visible')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-hidden-last')).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('trap-hidden-visible')).toBeFocused()

      await page.getByTestId('close-trap-hidden').click()
      await expect(page.getByTestId('open-trap-hidden')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('nested traps keep Tab in the inner scope until it closes', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-nested').click()
      await expect(page.getByTestId('nested-outer-first')).toBeFocused()

      await page.getByTestId('open-nested-inner').click()
      await expect(page.getByTestId('nested-inner-first')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('nested-inner-last')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('close-nested-inner')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('nested-inner-first')).toBeFocused()

      await page.getByTestId('close-nested-inner').click()
      await page.getByTestId('close-nested').focus()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('nested-outer-first')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('roving tabindex follows APG arrows, Home/End, RTL, and disabled skips', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      await page.getByTestId('before-roving').focus()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'One' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Alpha' })).toBeFocused()

      await page.getByRole('button', { name: 'One' }).click()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('button', { name: 'Three' })).toBeFocused()
      await page.keyboard.press('End')
      await expect(page.getByRole('button', { name: 'Four' })).toBeFocused()
      await page.keyboard.press('Home')
      await expect(page.getByRole('button', { name: 'One' })).toBeFocused()

      await page.getByRole('button', { name: 'Alpha' }).click()
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('button', { name: 'Beta' })).toBeFocused()

      await page.getByRole('button', { name: 'Rightmost' }).click()
      await page.keyboard.press('ArrowLeft')
      await expect(page.getByRole('button', { name: 'Middle' })).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('wraps Tab and Shift+Tab cleanly across checked and trailing unchecked native radios', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-trap-radio').click()

      await expect(page.getByTestId('close-trap-radio')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-radio-checked')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('close-trap-radio')).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('trap-radio-checked')).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('close-trap-radio')).toBeFocused()

      await page.getByTestId('close-trap-radio').click()
      await expect(page.getByTestId('open-trap-radio')).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('wraps Tab and Shift+Tab cleanly across an all-unchecked native radio group', async ({
    page,
    browserName,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.getByTestId('open-trap-radio-unchecked').click()

      await expect(page.getByTestId('trap-radio-unchecked-1')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('close-trap-radio-unchecked')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('trap-radio-unchecked-1')).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('close-trap-radio-unchecked')).toBeFocused()
      // Which radio receives focus when Shift+Tab enters an all-unchecked group
      // is engine-defined (HTML leaves it to the user agent): Chromium and
      // Firefox pick the first radio, WebKit the last. The trap must leave that
      // native choice alone; either way the group stays a single Tab stop.
      await page.keyboard.press('Shift+Tab')
      await expect(
        page.getByTestId(
          browserName === 'webkit'
            ? 'trap-radio-unchecked-2'
            : 'trap-radio-unchecked-1',
        ),
      ).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByTestId('close-trap-radio-unchecked')).toBeFocused()

      await page.getByTestId('close-trap-radio-unchecked').click()
      await expect(page.getByTestId('open-trap-radio-unchecked')).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
