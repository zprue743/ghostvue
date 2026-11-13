import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

function parseRgb(value: string): readonly [number, number, number] {
  const match = value.match(/(\d+(?:\.\d+)?)/g)
  if (!match || match.length < 3) {
    throw new Error(`Expected an rgb() color, received ${value}`)
  }
  return [Number(match[0]), Number(match[1]), Number(match[2])]
}

function channelDistance(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2])
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  const linear = rgb.map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  const first = relativeLuminance(left)
  const second = relativeLuminance(right)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

test.describe('docs code blocks', () => {
  test('dark fences follow the navy canvas and keep Shiki readable', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      })
      await page.goto(`${docs.url}/components/button.html`)

      const source = page.locator(
        '[data-example-id="button/themed"] + div[class*="language-"]',
      )
      await expect(source).toBeVisible()
      await expect
        .poll(async () =>
          page.evaluate(() =>
            document.documentElement.classList.contains('dark')
              ? 'dark'
              : 'light',
          ),
        )
        .toBe('dark')

      const colors = await page.evaluate(() => {
        const toSrgb = (cssColor: string): [number, number, number] => {
          // Chromium keeps color-mix() as oklch(); canvas 2D resolves sRGB.
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const context = canvas.getContext('2d')
          if (!context) {
            throw new Error('2D canvas context is required to resolve colors')
          }
          context.fillStyle = cssColor
          context.fillRect(0, 0, 1, 1)
          const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
          return [red, green, blue]
        }
        const root = document.documentElement
        const block = document.querySelector(
          '[data-example-id="button/themed"] + div[class*="language-"]',
        )
        const span = block?.querySelector('.vp-code span[style*="--shiki-"]')
        const pageBg = getComputedStyle(root).backgroundColor
        const codeBlockBg = block ? getComputedStyle(block).backgroundColor : ''
        const tokenColor = span ? getComputedStyle(span).color : ''
        return {
          pageBg: toSrgb(pageBg),
          codeBlockBg: toSrgb(codeBlockBg),
          tokenColor: toSrgb(tokenColor),
        }
      })

      const pageBg = colors.pageBg
      const codeBlockBg = colors.codeBlockBg
      const tokenColor = colors.tokenColor
      // Calm dark canvas is ink navy; the dark-tuned muted ramp is grey-green.
      const mutedGreyGreen = [45, 50, 51] as const

      expect(pageBg[2]).toBeGreaterThan(pageBg[1])
      expect(channelDistance(codeBlockBg, pageBg)).toBeLessThan(
        channelDistance(codeBlockBg, mutedGreyGreen),
      )
      expect(codeBlockBg[2]).toBeGreaterThan(codeBlockBg[1])
      expect(contrastRatio(tokenColor, codeBlockBg)).toBeGreaterThanOrEqual(4.5)
    } finally {
      await docs.close()
    }
  })

  test('light fences keep the muted surface mapping', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({
        colorScheme: 'light',
        reducedMotion: 'reduce',
      })
      await page.goto(`${docs.url}/components/button.html`)

      const source = page.locator(
        '[data-example-id="button/themed"] + div[class*="language-"]',
      )
      await expect(source).toBeVisible()
      await expect
        .poll(async () =>
          page.evaluate(() =>
            document.documentElement.classList.contains('dark')
              ? 'dark'
              : 'light',
          ),
        )
        .toBe('light')

      const colors = await page.evaluate(() => {
        const root = document.documentElement
        const block = document.querySelector(
          '[data-example-id="button/themed"] + div[class*="language-"]',
        )
        return {
          codeBlockBg: block ? getComputedStyle(block).backgroundColor : '',
          muted: getComputedStyle(root)
            .getPropertyValue('--ghost-surface-muted-bg')
            .trim(),
        }
      })

      const muted = colors.muted.replace('#', '')
      expect(muted).toMatch(/^[0-9a-f]{6}$/i)
      const mutedRgb = [
        Number.parseInt(muted.slice(0, 2), 16),
        Number.parseInt(muted.slice(2, 4), 16),
        Number.parseInt(muted.slice(4, 6), 16),
      ] as const
      expect(parseRgb(colors.codeBlockBg)).toEqual([...mutedRgb])
    } finally {
      await docs.close()
    }
  })
})
