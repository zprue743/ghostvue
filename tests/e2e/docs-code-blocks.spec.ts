import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { exampleSourceBlock, openExampleSource } from './docs-example-source'
import { startStaticServer } from './static-server'

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

      await openExampleSource(page, 'button/themed')
      const source = exampleSourceBlock(page, 'button/themed')
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
          '[data-example-id="button/themed"] [data-testid="ghost-example-source"] > div[class*="language-"]',
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

      await openExampleSource(page, 'button/themed')
      const source = exampleSourceBlock(page, 'button/themed')
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
          '[data-example-id="button/themed"] [data-testid="ghost-example-source"] > div[class*="language-"]',
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

      await openExampleSource(page, 'button/themed')
      const source = exampleSourceBlock(page, 'button/themed')
      await expect(source).toBeVisible()

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
        const root = document.documentElement
        const block = document.querySelector(
          '[data-example-id="button/themed"] [data-testid="ghost-example-source"] > div[class*="language-"]',
        )
        const codeBlockBg = block ? getComputedStyle(block).backgroundColor : ''
        const pageBg = getComputedStyle(root).backgroundColor
        return {
          codeBlockBg: toSrgb(codeBlockBg),
          pageBg: toSrgb(pageBg),
        }
      })

      expect(
        channelDistance(colors.codeBlockBg, colors.pageBg),
      ).toBeGreaterThan(8)
    } finally {
      await docs.close()
    }
  })

  test('dark preview stage and elevated card stay distinct from page canvas', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.emulateMedia({
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      })
      await page.goto(`${docs.url}/components/card.html`)

      const preview = page
        .locator('[data-example-id="card/themed"]')
        .getByTestId('ghost-example-preview')
      await expect(preview).toBeVisible()
      const card = preview.locator('.ghost-card').first()
      await expect(card).toBeVisible()

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
        const previewEl = document.querySelector(
          '[data-example-id="card/themed"] [data-testid="ghost-example-preview"]',
        )
        const cardEl = previewEl?.querySelector('.ghost-card')
        return {
          pageBg: toSrgb(
            getComputedStyle(document.documentElement).backgroundColor,
          ),
          previewBg: toSrgb(
            previewEl ? getComputedStyle(previewEl).backgroundColor : '',
          ),
          cardBg: toSrgb(
            cardEl ? getComputedStyle(cardEl).backgroundColor : '',
          ),
        }
      })

      expect(channelDistance(colors.previewBg, colors.pageBg)).toBeGreaterThan(
        6,
      )
      expect(channelDistance(colors.cardBg, colors.previewBg)).toBeGreaterThan(
        6,
      )
      expect(colors.previewBg[2]).toBeGreaterThan(colors.previewBg[1])
      expect(colors.cardBg[2]).toBeGreaterThan(colors.cardBg[1])
    } finally {
      await docs.close()
    }
  })

  test('standalone fences and DemoPreview share unified Shiki framing and copy-to-checkmark control', async ({
    browser,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    const context = await browser.newContext()
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`${docs.url}/getting-started.html`)

      const fence = page
        .locator(
          '.vp-doc div[class*="language-"]:not(.ghost-example__source div)',
        )
        .first()
      await expect(fence).toBeVisible()

      const metrics = await fence.evaluate((el) => {
        const fenceStyle = getComputedStyle(el)
        const probe = document.createElement('div')
        probe.style.borderRadius = 'var(--ghost-radius-lg)'
        el.append(probe)
        const expectedRadius = getComputedStyle(probe).borderTopLeftRadius
        probe.remove()
        const codeEl = el.querySelector('pre code')
        const codeStyle = codeEl ? getComputedStyle(codeEl) : null
        const copyBtn = el.querySelector('button.copy')
        const copyStyle = copyBtn ? getComputedStyle(copyBtn) : null
        return {
          borderWidth: fenceStyle.borderTopWidth,
          borderRadius: fenceStyle.borderTopLeftRadius,
          expectedRadius,
          fontSize: codeStyle?.fontSize ?? '',
          lineHeight: codeStyle?.lineHeight ?? '',
          copyWidth: copyStyle?.width ?? '',
          copyHeight: copyStyle?.height ?? '',
          copyRadius: copyStyle?.borderTopLeftRadius ?? '',
        }
      })

      expect(metrics.borderWidth).toBe('1px')
      expect(Number.parseFloat(metrics.borderRadius)).toBeGreaterThan(0)
      expect(metrics.borderRadius).toBe(metrics.expectedRadius)
      expect(metrics.fontSize).toBe('13px')
      expect(Number.parseFloat(metrics.lineHeight)).toBeCloseTo(13 * 1.6, 0)
      expect(metrics.copyWidth).toBe('28px')
      expect(metrics.copyHeight).toBe('28px')
      expect(metrics.copyRadius).toBe('6px')

      const copyBtn = fence.locator('button.copy')
      const status = fence.getByRole('status')
      await expect(copyBtn.locator('.ghost-copy-icon__copy')).toHaveCount(1)
      await expect(copyBtn.locator('.ghost-copy-icon__check')).toHaveCount(1)

      await copyBtn.focus()
      await page.keyboard.press('Enter')
      await expect(copyBtn).toHaveClass(/\bcopied\b/)
      await expect(status).toHaveText('Copied')
      await expect(copyBtn).toBeFocused()

      const axe = await new AxeBuilder({ page })
        .include('.vp-doc div[class*="language-"]')
        .analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await context.close()
      await docs.close()
    }
  })

  test('DemoPreview copy button is 28x28 with 6px radius and flush source fence', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/button.html`)
      await openExampleSource(page, 'button/themed')
      const sourceFence = exampleSourceBlock(page, 'button/themed')
      const copyBtn = page
        .locator('[data-example-id="button/themed"]')
        .getByRole('button', { name: 'Copy Themed source' })

      const metrics = await Promise.all([
        sourceFence.evaluate((el) => {
          const style = getComputedStyle(el)
          return {
            borderWidth: style.borderTopWidth,
            borderRadius: style.borderTopLeftRadius,
          }
        }),
        copyBtn.evaluate((el) => {
          const style = getComputedStyle(el)
          return {
            width: style.width,
            height: style.height,
            radius: style.borderTopLeftRadius,
          }
        }),
      ])

      expect(metrics[0].borderWidth).toBe('0px')
      expect(metrics[0].borderRadius).toBe('0px')
      expect(metrics[1].width).toBe('28px')
      expect(metrics[1].height).toBe('28px')
      expect(metrics[1].radius).toBe('6px')
    } finally {
      await docs.close()
    }
  })
})
