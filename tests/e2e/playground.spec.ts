import { test } from '@playwright/test'
import type { Locator } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { expect, gotoPlayground, playgroundTest } from '../support/playground'

import { startStaticServer } from './static-server'

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

playgroundTest(
  'playground shell loads without detectable accessibility violations',
  async ({ page, playgroundUrl }) => {
    await gotoPlayground(page, playgroundUrl)

    await expect(
      page.getByRole('heading', { name: 'GhostVue playground' }),
    ).toBeVisible()

    await expectNoAxeViolations(page)
  },
)

playgroundTest(
  'GhostBadge renders compact metadata without becoming a tab stop',
  async ({ page, playgroundUrl }) => {
    await gotoPlayground(page, playgroundUrl)

    const section = page.getByRole('region', { name: 'GhostBadge' })
    const headless = section.getByRole('group', { name: 'Headless' })
    const themedGroup = section.getByRole('group', { name: 'Themed badges' })
    const themed = themedGroup.getByTestId('themed-badge')
    const headlessBadge = headless.locator('.ghost-badge').first()

    await expect(headlessBadge).toHaveJSProperty('tagName', 'SPAN')
    await expect(headlessBadge).toHaveAttribute('data-part', 'root')
    await expect(headlessBadge).not.toHaveAttribute('role')
    await expect(headlessBadge).toHaveText('Active')

    expect(
      await themed.evaluate((element) => (element as HTMLElement).tabIndex),
    ).toBe(-1)

    const live = themedGroup.getByText('Live', { exact: true })
    await expect(live.locator('[data-part="icon"]')).toBeVisible()
    await expect(live.locator('svg')).toHaveAttribute('aria-hidden', 'true')

    await expect(themed).not.toHaveAttribute('data-variant')
    await expect(themed).not.toHaveAttribute('data-tone')
    await expect(themed).not.toHaveAttribute('data-size')

    const overdue = themedGroup.getByText('Overdue', { exact: true })
    await expect(overdue).toHaveAttribute('data-variant', 'outline')
    await expect(overdue).toHaveAttribute('data-tone', 'danger')

    const count = themedGroup.getByText('24', { exact: true })
    await expect(count).toHaveAttribute('data-variant', 'solid')
    await expect(count).toHaveAttribute('data-size', 'md')

    await expect(themedGroup.getByText('New', { exact: true })).toBeAttached()
    await expect(themedGroup.getByRole('cell', { name: 'Draft' })).toBeVisible()

    for (const tone of ['accent', 'neutral', 'danger']) {
      for (const variant of ['solid', 'soft', 'outline', 'ghost']) {
        await themed.evaluate(
          (element, options) => {
            element.setAttribute('data-tone', options.tone)
            element.setAttribute('data-variant', options.variant)
          },
          { tone, variant },
        )
        await expect
          .poll(async () => textContrast(themed, themedGroup), {
            message: `${tone} ${variant} text contrast`,
          })
          .toBeGreaterThanOrEqual(4.5)
      }
    }

    await page.emulateMedia({ forcedColors: 'active' })
    await expect(themed).toBeVisible()
    await expect(themed).toHaveCSS('box-shadow', 'none')
  },
)

test('GhostCollapsible toggles in-flow disclosure from the playground', async ({
  page,
}) => {
  const playground = await startStaticServer('apps/playground/dist')

  try {
    await page.goto(playground.url)

    const section = page.getByRole('region', { name: 'GhostCollapsible' })
    const trigger = section.getByRole('button', { name: 'Expand billing memo' })
    const panel = section.getByTestId('collapsible-headless-content')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('hidden', '')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).not.toHaveAttribute('hidden', '')

    const disabled = section.getByRole('button', {
      name: 'Disabled disclosure control',
    })
    await expect(disabled).toBeDisabled()
  } finally {
    await playground.close()
  }
})
