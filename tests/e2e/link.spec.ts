import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostLink', () => {
  test('external example passes axe and exposes rel defaults', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/external`)
      const link = page.getByRole('link', { name: /WAI-ARIA link pattern/i })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link.locator('[data-part="external-icon"]')).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('disabled example is not focusable', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/disabled`)
      const link = page.getByText('Unavailable destination')
      await expect(link).toHaveAttribute('aria-disabled', 'true')
      await expect(link).not.toHaveAttribute('href')
      await expect(link).toHaveAttribute('tabindex', '-1')
      await page.keyboard.press('Tab')
      await expect(link).not.toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('themed example paints inline and subtle underlines differently', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      // The example opts into recipes itself; the host only picks tokens.
      await page.goto(
        `${playground.url}/examples.html?id=link/themed&theme=default&mode=light`,
      )

      const inline = page.getByRole('link', { name: /inline\)/i })
      const subtle = page.getByRole('link', { name: /subtle\)/i })
      const inlineDecoration = await inline.evaluate(
        (element) => getComputedStyle(element).textDecorationColor,
      )
      const subtleDecoration = await subtle.evaluate(
        (element) => getComputedStyle(element).textDecorationColor,
      )

      expect(inlineDecoration).not.toBe(subtleDecoration)
      expect(subtleDecoration).toMatch(
        /rgba?\(\s*0,\s*0,\s*0,\s*0\)|transparent/,
      )
    } finally {
      await playground.close()
    }
  })

  test('basic example supports keyboard focus', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/basic`)
      const link = page.getByRole('link', { name: 'GhostButton docs' })
      await link.focus()
      await expect(link).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('disabled example blocks middle-click and modifier-click', async ({
    page,
    context,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      const initialUrl = `${playground.url}/examples.html?id=link/disabled`
      await page.goto(initialUrl)
      const link = page.getByText('Unavailable destination')

      await link.evaluate((element) => {
        const win = window as unknown as {
          __ghostAuxClicks?: number
          __ghostClicks?: number
        }
        win.__ghostAuxClicks = 0
        win.__ghostClicks = 0
        element.addEventListener('auxclick', () => {
          win.__ghostAuxClicks = (win.__ghostAuxClicks ?? 0) + 1
        })
        element.addEventListener('click', () => {
          win.__ghostClicks = (win.__ghostClicks ?? 0) + 1
        })
      })

      let openedPage = false
      context.on('page', () => {
        openedPage = true
      })

      await link.click({ button: 'middle', force: true })
      await link.click({ modifiers: ['Control'], force: true })
      await link.click({ modifiers: ['Meta'], force: true })

      expect(openedPage).toBe(false)
      expect(page.url()).toBe(initialUrl)
      const counts = await page.evaluate(() => {
        const win = window as unknown as {
          __ghostAuxClicks?: number
          __ghostClicks?: number
        }
        return {
          auxClicks: win.__ghostAuxClicks ?? 0,
          clicks: win.__ghostClicks ?? 0,
        }
      })
      expect(counts).toEqual({ auxClicks: 0, clicks: 0 })
    } finally {
      await playground.close()
    }
  })

  test('basic example keeps native middle-click and modifier-click behavior', async ({
    page,
    context,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/basic`)
      const link = page.getByRole('link', { name: 'GhostButton docs' })
      const href = await link.getAttribute('href')
      expect(href).toBeTruthy()
      if (!href) {
        throw new Error('Expected href attribute on basic link')
      }

      const [middlePopup] = await Promise.all([
        context.waitForEvent('page'),
        link.click({ button: 'middle' }),
      ])
      expect(middlePopup.url()).toContain(href)
      await middlePopup.close()

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
      const [modifierPopup] = await Promise.all([
        context.waitForEvent('page'),
        link.click({ modifiers: [modifier] }),
      ])
      expect(modifierPopup.url()).toContain(href)
      await modifierPopup.close()
    } finally {
      await playground.close()
    }
  })

  test('button-styled link example keeps link role, keyboard focus, disabled contract, and passes axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=link/button&theme=default&mode=light`,
      )
      const primary = page.getByRole('link', { name: 'Get started' })
      await expect(primary).toBeVisible()
      await expect(primary).toHaveAttribute('href', '/getting-started')
      await expect(primary).toHaveAttribute('data-appearance', 'button')
      // No nested interactive elements inside the link.
      await expect(primary.locator('button, a')).toHaveCount(0)

      await primary.focus()
      await expect(primary).toBeFocused()

      const disabled = page.getByText('Unavailable destination')
      await expect(disabled).toHaveAttribute('aria-disabled', 'true')
      await expect(disabled).toHaveAttribute('tabindex', '-1')
      await expect(disabled).not.toHaveAttribute('href')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
