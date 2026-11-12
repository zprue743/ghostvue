import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

interface DotSample {
  name: string
  playState: string | undefined
  currentTime: number | null
  duration: number | null
  computedDuration: string
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
        const timing = animation?.effect?.getComputedTiming()
        return {
          name:
            animation instanceof CSSAnimation
              ? animation.animationName
              : style.animationName,
          playState: animation?.playState,
          currentTime:
            typeof animation?.currentTime === 'number'
              ? animation.currentTime
              : null,
          duration:
            typeof timing?.duration === 'number' ? timing.duration : null,
          computedDuration: style.animationDuration,
          offset: rect.left - trackRect.left,
          remaining: trackRect.right - rect.right,
          trackWidth: trackRect.width,
          opacity: Number.parseFloat(style.opacity),
        }
      },
    ),
  )
}

async function waitForDotsFinished(page: Page): Promise<DotSample[]> {
  await expect
    .poll(
      async () => {
        const snapshot = await measureDots(page)
        return snapshot.every((dot) => dot.playState === 'finished')
      },
      { timeout: 5000 },
    )
    .toBe(true)
  return measureDots(page)
}

test.describe('docs motion demos', () => {
  // Aside outline is `min-width: 1280px` when a sidebar is present. Stay above
  // that so the active marker assertion is actually observing the outline.
  test.use({ viewport: { width: 1440, height: 900 } })

  test('replay remounts after the first play and keeps the outline marker', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/themes/motion.html`)
      await page.getByTestId('motion-docs-board').scrollIntoViewIfNeeded()
      await expect(
        page.getByTestId('motion-docs-dot-standard'),
      ).toHaveAttribute('data-motion', 'standard')
      await expect(
        page.locator('.VPDocAsideOutline a.outline-link.active'),
      ).toBeVisible()

      const firstEnd = await waitForDotsFinished(page)
      expect(firstEnd).toHaveLength(6)
      for (const dot of firstEnd) {
        expect(dot.name).toBe('ghost-docs-motion-shift')
        expect(dot.offset).toBeGreaterThan(dot.trackWidth * 0.7)
        expect(dot.remaining).toBeLessThan(16)
      }

      const activeOutline = page.locator(
        '.VPDocAsideOutline a.outline-link.active',
      )
      await expect(activeOutline).toBeVisible()
      const activeHref = await activeOutline.getAttribute('href')
      expect(activeHref).toBeTruthy()
      if (!activeHref) return
      const marker = page.locator('.VPDocAsideOutline .outline-marker')
      await expect(marker).toHaveCSS('opacity', '1')

      await page.getByTestId('motion-docs-replay').click()

      await expect(activeOutline).toBeVisible()
      await expect(activeOutline).toHaveAttribute('href', activeHref)
      await expect(marker).toHaveCSS('opacity', '1')

      let restart = firstEnd
      await expect
        .poll(
          async () => {
            restart = await measureDots(page)
            return restart.every((dot, index) => {
              const fromEnd = firstEnd[index]
              return (
                fromEnd !== undefined &&
                dot.playState === 'running' &&
                (dot.currentTime ?? Number.POSITIVE_INFINITY) < 300 &&
                dot.offset < fromEnd.offset
              )
            })
          },
          { timeout: 400 },
        )
        .toBe(true)
      expect(restart).toHaveLength(6)
      for (const dot of restart) {
        expect(dot.name).toBe('ghost-docs-motion-shift')
        expect(dot.offset).toBeLessThan(dot.trackWidth * 0.25)
      }

      let middle = restart
      await expect
        .poll(
          async () => {
            middle = await measureDots(page)
            return middle.every((dot, index) => {
              const from = restart[index]
              return from !== undefined && dot.offset > from.offset + 12
            })
          },
          { timeout: 1500 },
        )
        .toBe(true)

      const secondEnd = await waitForDotsFinished(page)
      expect(secondEnd).toHaveLength(6)
      for (const [index, dot] of secondEnd.entries()) {
        const during = middle[index]
        expect(during).toBeDefined()
        if (!during) continue

        expect(dot.name).toBe('ghost-docs-motion-shift')
        expect(during.offset).toBeGreaterThan(restart[index]?.offset ?? 0)
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

      const fadeTiming = await measureDots(page)
      expect(fadeTiming).toHaveLength(6)
      for (const dot of fadeTiming) {
        expect(dot.name).toBe('ghost-motion-fade')
        expect(dot.duration).toBeGreaterThanOrEqual(650)
        expect(dot.duration).toBeLessThanOrEqual(750)
        expect(dot.computedDuration).toBe('0.7s')
      }

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
              duration: animation?.effect?.getComputedTiming().duration ?? null,
              computedDuration: style.animationDuration,
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
        expect(dot.duration).toBeGreaterThanOrEqual(650)
        expect(dot.duration).toBeLessThanOrEqual(750)
        expect(dot.computedDuration).toBe('0.7s')
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
