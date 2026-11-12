import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('motion tokens', () => {
  test('scales durations with intensity and collapses movement under reduced motion', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const themedGroup = page.getByRole('group', { name: 'Default theme' })
      const action = themedGroup.getByRole('button', { name: 'Add item' })
      const stage = page.getByTestId('motion-stage')

      await expect(action).toHaveCSS(
        'transition-duration',
        '0.12s, 0.12s, 0.12s, 0.12s, 0.12s, 0.504s',
      )
      expect(
        await stage.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-intensity')
            .trim(),
        ),
      ).toBe('1')
      expect(
        await stage.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-easing-standard')
            .replaceAll(' ', ''),
        ),
      ).toMatch(/cubic-bezier\(0?\.2,0,0,1\)/)
      expect(
        await stage.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-spring-gentle')
            .trim()
            .startsWith('linear('),
        ),
      ).toBe(true)

      await action.evaluate((element) => {
        element.style.setProperty('--ghost-motion-intensity', '0.5')
      })
      await expect(action).toHaveCSS(
        'transition-duration',
        '0.06s, 0.06s, 0.06s, 0.06s, 0.06s, 0.252s',
      )
      await action.evaluate((element) => {
        element.style.removeProperty('--ghost-motion-intensity')
      })

      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(action).toHaveCSS(
        'transition-duration',
        '0.08s, 0.08s, 0.08s, 0.08s, 0.08s, 0.08s',
      )
      expect(
        await stage.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-translate')
            .trim(),
        ),
      ).toBe('0px')
      expect(
        await stage.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-motion-scale')
            .trim(),
        ),
      ).toBe('1')

      const fadeDot = page.getByTestId('motion-dot-standard')
      expect(
        await fadeDot.evaluate(
          (element) => getComputedStyle(element).animationName,
        ),
      ).toBe('ghost-motion-fade')
    } finally {
      await playground.close()
    }
  })
})
