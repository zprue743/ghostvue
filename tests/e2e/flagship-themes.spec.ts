import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

const flagships = ['calm', 'vibrant', 'mono'] as const
const modes = ['light', 'dark'] as const

async function pinShot(shot: {
  evaluate: (fn: (element: HTMLElement) => void) => Promise<void>
}) {
  await shot.evaluate((element) => {
    element.style.boxSizing = 'border-box'
    element.style.height = '232px'
    element.style.overflow = 'hidden'
    element.style.width = '1240px'
  })
}

test.describe('Flagship GhostButton matrices', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('snapshots each flagship in light and dark', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.evaluate(() => document.fonts.ready)

      for (const theme of flagships) {
        const host = page.getByTestId(`button-state-matrix-${theme}`)
        await expect(host.locator('.mode-block').first()).toHaveAttribute(
          'data-ghost-theme',
          theme,
        )

        for (const mode of modes) {
          const shot = page.getByTestId(
            `button-matrix-shot-${theme}-${mode}-comfortable`,
          )
          await pinShot(shot)
          await expect(shot).toHaveScreenshot(
            `button-matrix-${theme}-${mode}.png`,
            {
              ...screenshotOptions,
              mask: [shot.locator('.cell-label'), shot.locator('.tone-label')],
            },
          )
        }
      }
    } finally {
      await playground.close()
    }
  })
})

test.describe('Nested named themes under ancestor mode', () => {
  test('inherits effective ancestor mode without leaking tokens to siblings', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const results = await page.evaluate(() => {
        const container = document.createElement('div')
        container.innerHTML = `
          <div id="dark-host" class="ghost-theme" data-ghost-mode="dark">
            <div id="nested-calm" data-ghost-theme="calm">
              <span id="nested-calm-child"></span>
              <div id="nested-calm-light-override" data-ghost-mode="light"></div>
            </div>
            <div id="default-sibling"></div>
            <div id="mid-light" data-ghost-mode="light">
              <div id="calm-under-light" data-ghost-theme="calm"></div>
              <div id="deep-dark" data-ghost-mode="dark">
                <div id="calm-under-deep-dark" data-ghost-theme="calm"></div>
              </div>
            </div>
          </div>
          <div id="calm-dark-host" data-ghost-theme="calm" data-ghost-mode="dark">
            <div id="nested-default" data-ghost-theme="default"></div>
          </div>
        `
        document.body.appendChild(container)

        const readVar = (id: string) => {
          const element = document.getElementById(id)
          if (!element) {
            throw new Error(`Missing test element #${id}`)
          }
          return getComputedStyle(element)
            .getPropertyValue('--ghost-action-primary-bg')
            .trim()
        }

        const values = {
          nestedCalm: readVar('nested-calm'),
          nestedCalmChild: readVar('nested-calm-child'),
          nestedCalmLightOverride: readVar('nested-calm-light-override'),
          defaultSibling: readVar('default-sibling'),
          calmUnderLight: readVar('calm-under-light'),
          calmUnderDeepDark: readVar('calm-under-deep-dark'),
          nestedDefault: readVar('nested-default'),
        }

        container.remove()
        return values
      })

      expect(results.nestedCalm).toBe('#00b6d4')
      expect(results.nestedCalmChild).toBe('#00b6d4')
      expect(results.nestedCalmLightOverride).toBe('#006c7e')
      expect(results.defaultSibling).toBe('#60a5fa')
      expect(results.calmUnderLight).toBe('#006c7e')
      expect(results.calmUnderDeepDark).toBe('#00b6d4')
      expect(results.nestedDefault).toBe('#60a5fa')
    } finally {
      await playground.close()
    }
  })
})
