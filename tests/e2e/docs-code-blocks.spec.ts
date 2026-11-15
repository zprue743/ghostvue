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

  test('light fences keep Shiki tokens at least 4.5:1', async ({ page }) => {
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
        const toSrgb = (cssColor: string): [number, number, number] => {
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
        const block = document.querySelector(
          '[data-example-id="button/themed"] + div[class*="language-"]',
        )
        const span = block?.querySelector('.vp-code span[style*="--shiki-"]')
        const codeBlockBg = block ? getComputedStyle(block).backgroundColor : ''
        const tokenColor = span ? getComputedStyle(span).color : ''
        return {
          codeBlockBg: toSrgb(codeBlockBg),
          tokenColor: toSrgb(tokenColor),
        }
      })

      expect(
        contrastRatio(colors.tokenColor, colors.codeBlockBg),
      ).toBeGreaterThanOrEqual(4.5)
    } finally {
      await docs.close()
    }
  })

  test('light fences stay darker than the page canvas', async ({ page }) => {
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

      const colors = await page.evaluate(() => {
        const root = document.documentElement
        const block = document.querySelector(
          '[data-example-id="button/themed"] + div[class*="language-"]',
        )
        return {
          codeBlockBg: block ? getComputedStyle(block).backgroundColor : '',
          pageBg: getComputedStyle(root).backgroundColor,
        }
      })

      const codeBlockBg = parseRgb(colors.codeBlockBg)
      const pageBg = parseRgb(colors.pageBg)
      expect(channelDistance(codeBlockBg, pageBg)).toBeGreaterThan(8)
    } finally {
      await docs.close()
    }
  })
})
