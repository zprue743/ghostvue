import type { Locator } from '@playwright/test'

import {
  expect,
  expectFocus,
  gotoPlayground,
  playgroundTest,
  pressSequence,
} from '../support'

async function textContrast(button: Locator, surface: Locator) {
  const surfaceElement = await surface.elementHandle()

  return button.evaluate((element, surfaceNode) => {
    function rgb(color: string) {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Missing 2d canvas context')
      }
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
      return { red, green, blue, alpha }
    }

    function luminance(red: number, green: number, blue: number) {
      const channel = (value: number) => {
        const normalized = value / 255
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      }
      return (
        0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
      )
    }

    const style = getComputedStyle(element)
    let background = rgb(style.backgroundColor)
    const foreground = rgb(style.color)
    if (background.alpha === 0) {
      background = rgb(getComputedStyle(surfaceNode).backgroundColor)
    }
    const first = luminance(foreground.red, foreground.green, foreground.blue)
    const second = luminance(background.red, background.green, background.blue)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  }, surfaceElement)
}

playgroundTest.describe('GhostButton', () => {
  playgroundTest(
    'supports native activation, focus, and unavailable states',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const action = page.getByRole('button', { name: 'Run action' })
      await action.focus()
      await expectFocus(action)
      await pressSequence(page, ['Enter'])
      await expect(page.getByText('Activations: 1')).toBeVisible()
      await pressSequence(page, ['Space'])
      await expect(page.getByText('Activations: 2')).toBeVisible()

      await page.getByRole('button', { name: 'Default form action' }).click()
      await expect(page.getByText('Form submissions: 0')).toBeVisible()
      await page.getByRole('button', { name: 'Submit form' }).click()
      await expect(page.getByText('Form submissions: 1')).toBeVisible()

      const disabled = page.getByRole('button', { name: 'Disabled action' })
      const loading = page.getByRole('button', { name: 'Publishing' })
      await expect(disabled).toBeDisabled()
      await expect(loading).not.toHaveAttribute('disabled', '')
      await expect(loading).toHaveAttribute('aria-disabled', 'true')
      await expect(loading).toHaveAttribute('aria-busy', 'true')
      await expect(loading).toHaveAttribute('data-state', 'loading')

      const themedGroup = page.getByRole('group', { name: 'Default theme' })
      const themedAction = themedGroup.getByRole('button', { name: 'Add item' })
      await expect(themedAction).toHaveCSS(
        'background-color',
        'rgb(29, 78, 216)',
      )
      await expect(themedAction.locator('[data-part="icon"]')).toBeVisible()
      const iconSizes = await themedAction
        .locator('[data-part="icon"]')
        .evaluate((wrapper) => {
          const icon = wrapper.querySelector('svg')
          return {
            icon: icon?.getBoundingClientRect().width,
            wrapper: wrapper.getBoundingClientRect().width,
          }
        })
      expect(iconSizes.icon).toBe(iconSizes.wrapper)

      const neutral = themedGroup.getByRole('button', {
        name: 'Neutral action',
      })
      await expect(neutral).toHaveAttribute('data-variant', 'soft')
      await expect(neutral).toHaveAttribute('data-tone', 'neutral')

      const danger = themedGroup.getByRole('button', { name: 'Delete item' })
      await expect(danger).toHaveCSS('min-height', '48px')

      const overridden = themedGroup.getByRole('button', {
        name: 'Product action',
      })
      await expect(overridden).toHaveCSS(
        'background-color',
        'rgb(124, 58, 237)',
      )

      const iconOnly = themedGroup.getByRole('button', {
        name: 'Close playground',
      })
      await expect(iconOnly).toHaveAttribute('data-icon-only', '')

      await iconOnly.click()
      await expect(page.getByText('Activations: 3')).toBeVisible()

      const pending = themedGroup.getByRole('button', { name: 'Save changes' })
      const widthBeforeLoading = await pending.evaluate(
        (element) => element.getBoundingClientRect().width,
      )
      await pending.focus()
      await pending.click()
      await expectFocus(pending)
      await expect(pending).not.toHaveAttribute('disabled', '')
      await expect(pending).toHaveAttribute('aria-disabled', 'true')
      await expect(pending).toHaveAttribute('aria-busy', 'true')
      await expect(pending).toHaveAttribute('data-state', 'loading')
      await pending.evaluate((element) => {
        const button = element as HTMLButtonElement
        button.click()
      })
      await expect(page.getByText('Loading (activations: 1)')).toBeVisible()
      expect(
        await pending.evaluate(
          (element) => element.getBoundingClientRect().width,
        ),
      ).toBe(widthBeforeLoading)
    },
  )

  playgroundTest(
    'default theme adapts to accessibility and color preferences',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const themedGroup = page.getByRole('group', { name: 'Default theme' })
      const action = themedGroup.getByRole('button', { name: 'Add item' })
      const loading = themedGroup.getByRole('button', { name: 'Save changes' })
      await loading.click()

      await action.focus()
      await pressSequence(page, ['Tab', 'Shift+Tab'])
      await expectFocus(action)
      await expect(action).toHaveCSS('outline-color', 'rgb(15, 23, 42)')
      await expect(action).toHaveCSS('box-shadow', /rgb\(255, 255, 255\)/)

      const animatedLoadingIndicator = await loading.evaluate((element) => {
        const style = getComputedStyle(element, '::before')
        return { animationName: style.animationName, content: style.content }
      })
      expect(animatedLoadingIndicator.content).not.toBe('none')
      expect(animatedLoadingIndicator.animationName).not.toBe('none')

      const customLoading = themedGroup.getByRole('button', {
        name: 'Publishing',
      })
      await expect(
        customLoading.locator('[data-part="loading-indicator"]'),
      ).toBeVisible()
      expect(
        await customLoading.evaluate(
          (element) => getComputedStyle(element, '::before').content,
        ),
      ).toBe('none')

      await expect(action).toHaveCSS(
        'transition-duration',
        '0.12s, 0.12s, 0.12s, 0.12s, 0.12s, 0.504s',
      )

      await page.emulateMedia({ reducedMotion: 'reduce' })
      // Color feedback stays at 80ms; press scale is 1 and springs collapse.
      await expect(action).toHaveCSS(
        'transition-duration',
        '0.08s, 0.08s, 0.08s, 0.08s, 0.08s, 0.08s',
      )
      expect(
        await loading.evaluate(
          (element) => getComputedStyle(element, '::before').animationName,
        ),
      ).toBe('ghost-button-pulse')
      expect(
        await action.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-press-scale')
            .trim(),
        ),
      ).toBe('1')

      await themedGroup.evaluate((element) => {
        element.setAttribute('data-ghost-mode', 'dark')
      })
      await expect(themedGroup).toHaveCSS('color-scheme', 'dark')
      await expect(themedGroup).toHaveCSS('background-color', 'rgb(15, 23, 42)')
      await expect(action).toHaveCSS('background-color', 'rgb(96, 165, 250)')

      for (const tone of ['accent', 'neutral', 'danger']) {
        for (const variant of ['solid', 'soft', 'outline', 'ghost']) {
          await action.evaluate(
            (element, options) => {
              element.setAttribute('data-tone', options.tone)
              element.setAttribute('data-variant', options.variant)
            },
            { tone, variant },
          )
          await expect
            .poll(async () => textContrast(action, themedGroup), {
              message: `${tone} ${variant} text contrast`,
            })
            .toBeGreaterThanOrEqual(4.5)
        }
      }

      await page.emulateMedia({ forcedColors: 'active' })
      await action.focus()
      await expect(action).toHaveCSS('outline-style', 'solid')
      await expect(action).toHaveCSS('box-shadow', 'none')
      await expect(action).toBeVisible()
      await expect(action).toBeEnabled()
    },
  )

  playgroundTest(
    'unset data-ghost-mode follows prefers-color-scheme from CSS alone',
    async ({ page, playgroundUrl }) => {
      await gotoPlayground(page, playgroundUrl)

      const systemGroup = page.getByRole('group', { name: 'System mode' })
      const action = systemGroup.getByRole('button', { name: 'System action' })

      await page.emulateMedia({ colorScheme: 'light' })
      await expect(systemGroup).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      )
      await expect(action).toHaveCSS('background-color', 'rgb(29, 78, 216)')

      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(systemGroup).toHaveCSS('background-color', 'rgb(15, 23, 42)')
      await expect(action).toHaveCSS('background-color', 'rgb(96, 165, 250)')
    },
  )
})
