import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('ambient interactivity spike', () => {
  test('spotlight and tilt write pointer CSS variables on hover', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const spotlight = page.getByTestId('ambient-spotlight')
      const tilt = page.getByTestId('ambient-tilt')

      await expect(spotlight).toHaveAttribute('data-state', 'idle')
      await expect(tilt).toHaveAttribute('data-state', 'idle')
      await spotlight.scrollIntoViewIfNeeded()

      const spotlightBox = await spotlight.boundingBox()
      if (!spotlightBox) throw new Error('spotlight has no box')
      await page.mouse.move(spotlightBox.x + 48, spotlightBox.y + 36)
      await expect(spotlight).toHaveAttribute('data-state', 'tracking')
      expect(
        await spotlight.evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--sl-pointer-x').trim(),
        ),
      ).toBe('48px')
      expect(
        await spotlight.evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--sl-pointer-y').trim(),
        ),
      ).toBe('36px')

      await expect
        .poll(async () =>
          spotlight.evaluate((element) => {
            const glow = element.querySelector('[data-part="glow"]')
            return glow ? Number(getComputedStyle(glow).opacity) : 0
          }),
        )
        .toBeGreaterThan(0)

      await tilt.scrollIntoViewIfNeeded()
      const tiltBox = await tilt.boundingBox()
      if (!tiltBox) throw new Error('tilt has no box')
      await page.mouse.move(tiltBox.x + 80, tiltBox.y + 24)
      await expect(tilt).toHaveAttribute('data-state', 'tracking')
      const faceTransform = await tilt.evaluate((element) => {
        const face = element.querySelector('[data-part="face"]')
        return face ? getComputedStyle(face).transform : 'none'
      })
      expect(faceTransform).not.toBe('none')
      expect(faceTransform).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
    } finally {
      await playground.close()
    }
  })

  test('prefers-reduced-motion keeps surfaces off and still', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(playground.url)

      const spotlight = page.getByTestId('ambient-spotlight')
      const tilt = page.getByTestId('ambient-tilt')

      await expect(spotlight).toHaveAttribute('data-state', 'off')
      await expect(tilt).toHaveAttribute('data-state', 'off')

      await spotlight.hover({ position: { x: 48, y: 36 } })
      await expect(spotlight).toHaveAttribute('data-state', 'off')
      expect(
        await spotlight.evaluate((element) => {
          const glow = element.querySelector('[data-part="glow"]')
          return glow ? getComputedStyle(glow).opacity : 'missing'
        }),
      ).toBe('0')

      await tilt.hover({ position: { x: 80, y: 24 } })
      await expect(tilt).toHaveAttribute('data-state', 'off')
      expect(
        await tilt.evaluate((element) =>
          getComputedStyle(element).getPropertyValue('--sl-tilt-x').trim(),
        ),
      ).toBe('0')
      const faceTransform = await tilt.evaluate((element) => {
        const face = element.querySelector('[data-part="face"]')
        return face ? getComputedStyle(face).transform : 'missing'
      })
      expect(
        faceTransform === 'none' ||
          faceTransform === 'matrix(1, 0, 0, 1, 0, 0)',
      ).toBe(true)
    } finally {
      await playground.close()
    }
  })
})
