import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('focus primitives', () => {
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
})
