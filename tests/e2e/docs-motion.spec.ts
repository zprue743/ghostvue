import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

interface DotSample {
  name: string
  playState: string | undefined
  offset: number
  remaining: number
  trackWidth: number
  opacity: number
}

function parseTranslateX(value: string): number {
  if (!value || value === 'none') return 0
  const match = /-?\d+(?:\.\d+)?/.exec(value)
  return match ? Number.parseFloat(match[0]) : 0
}

async function measureDots(page: Page): Promise<DotSample[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="motion-docs-dot-"]')].map(
      (element) => {
        const style = getComputedStyle(element)
        const track = element.closest('.demo-track')
        if (!(track instanceof HTMLElement)) {
          throw new Error('motion demo track missing')
        }
        const rect = element.getBoundingClientRect()
        const trackRect = track.getBoundingClientRect()
        const animation = element.getAnimations()[0]
        return {
          name:
            animation instanceof CSSAnimation
              ? animation.animationName
              : style.animationName,
          playState: animation?.playState,
          offset: rect.left - trackRect.left,
          remaining: trackRect.right - rect.right,
          trackWidth: trackRect.width,
          opacity: Number.parseFloat(style.opacity),
        }
      },
    ),
  )
}

test.describe('docs motion demos', () => {
  test('replay travels the full track and the nested mode crossfade updates', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/themes/motion.html`)
      await page.getByTestId('motion-docs-board').scrollIntoViewIfNeeded()
      await expect(
        page.getByTestId('motion-docs-dot-standard'),
      ).toHaveAttribute('data-motion', 'standard')

      await page.getByTestId('motion-docs-replay').click()

      const start = await measureDots(page)
      expect(start).toHaveLength(6)

      let middle = start
      await expect
        .poll(
          async () => {
            middle = await measureDots(page)
            const firstStart = start[0]
            const firstMiddle = middle[0]
            if (!firstStart || !firstMiddle) return 0
            return firstMiddle.offset - firstStart.offset
          },
          { timeout: 1500 },
        )
        .toBeGreaterThan(20)

      await expect
        .poll(
          async () => {
            const snapshot = await measureDots(page)
            return snapshot.every((dot) => dot.playState === 'finished')
          },
          { timeout: 4000 },
        )
        .toBe(true)

      const late = await measureDots(page)
      expect(late).toHaveLength(6)

      for (const [index, dot] of late.entries()) {
        const from = start[index]
        const during = middle[index]
        expect(from).toBeDefined()
        expect(during).toBeDefined()
        if (!from || !during) continue

        expect(dot.name).toBe('ghost-docs-motion-shift')
        expect(during.offset).toBeGreaterThan(from.offset)
        expect(dot.offset).toBeGreaterThan(during.offset)
        expect(dot.offset).toBeGreaterThan(dot.trackWidth * 0.7)
        expect(dot.remaining).toBeLessThan(16)
        expect(dot.playState).toBe('finished')
      }

      const stage = page.getByTestId('motion-docs-stage')
      const lightBg = await stage.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      )
      await page.getByTestId('motion-docs-mode-dark').click()
      await expect(stage).toHaveAttribute('data-ghost-mode', 'dark')
      const darkBg = await stage.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      )
      expect(darkBg).not.toBe(lightBg)
    } finally {
      await docs.close()
    }
  })

  test('reduced-motion demo fades instead of traveling', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`${docs.url}/themes/motion.html`)
      await page.getByTestId('motion-docs-board').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('motion-docs-reduced-note')).toBeVisible()
      await expect(
        page.getByTestId('motion-docs-dot-standard'),
      ).toHaveAttribute('data-motion', 'standard')

      await page.getByTestId('motion-docs-replay').click()
      await expect(
        page.getByTestId('motion-docs-dot-standard'),
      ).toHaveAttribute('data-motion', 'standard')

      const fade = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid^="motion-docs-dot-"]')].map(
          (element) => {
            const animation = element.getAnimations()[0]
            const style = getComputedStyle(element)
            let opacityStart = Number.parseFloat(style.opacity)
            let opacityEnd = opacityStart
            if (animation) {
              const previous = animation.currentTime
              animation.pause()
              animation.currentTime = 0
              opacityStart = Number.parseFloat(
                getComputedStyle(element).opacity,
              )
              const duration = animation.effect?.getComputedTiming().duration
              animation.currentTime =
                typeof duration === 'number' && duration > 0 ? duration : 700
              opacityEnd = Number.parseFloat(getComputedStyle(element).opacity)
              animation.currentTime = previous
            }
            const keyframes =
              animation?.effect instanceof KeyframeEffect
                ? animation.effect.getKeyframes()
                : []
            return {
              name:
                animation instanceof CSSAnimation
                  ? animation.animationName
                  : style.animationName,
              translate: style.translate,
              opacityStart,
              opacityEnd,
              keyframeOpacities: keyframes.map((frame) => frame.opacity),
            }
          },
        ),
      )

      expect(fade).toHaveLength(6)
      for (const dot of fade) {
        expect(dot.name).toBe('ghost-motion-fade')
        expect(
          dot.translate === 'none' || parseTranslateX(dot.translate) === 0,
        ).toBe(true)
        const keyframeOpacity = dot.keyframeOpacities
          .map((value) => Number.parseFloat(String(value)))
          .filter((value) => Number.isFinite(value))
        if (keyframeOpacity.length >= 2) {
          expect(keyframeOpacity[0]).toBeLessThan(keyframeOpacity.at(-1) ?? 1)
        } else {
          expect(dot.opacityStart).toBeLessThan(dot.opacityEnd)
        }
      }
    } finally {
      await docs.close()
    }
  })
})
