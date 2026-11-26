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

  test('applies reduced-motion and forced-colors overrides to nested mode hosts', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      await page.evaluate(() => {
        const container = document.createElement('div')
        container.id = 'gho-148-fixture'
        container.innerHTML = `
          <div id="system-host" class="ghost-theme">
            <div id="system-nested-dark" data-ghost-mode="dark">
              <div
                id="system-nested-dark-probe"
                style="background-color: var(--ghost-action-primary-bg); transition-duration: var(--ghost-motion-duration-fast);"
              ></div>
            </div>
          </div>
          <div id="light-host" class="ghost-theme" data-ghost-mode="light">
            <div id="light-nested-dark" data-ghost-mode="dark">
              <div
                id="light-nested-dark-probe"
                style="background-color: var(--ghost-action-primary-bg); transition-duration: var(--ghost-motion-duration-fast);"
              ></div>
              <div id="nested-calm-inherited" data-ghost-theme="calm">
                <div
                  id="nested-calm-inherited-probe"
                  style="background-color: var(--ghost-action-primary-bg); transition-duration: var(--ghost-motion-duration-fast);"
                ></div>
              </div>
            </div>
          </div>
        `
        document.body.appendChild(container)
      })

      const readMotion = () =>
        page.evaluate(() => {
          const ids = [
            'system-nested-dark-probe',
            'light-nested-dark-probe',
            'nested-calm-inherited-probe',
          ]
          return Object.fromEntries(
            ids.map((id) => {
              const el = document.getElementById(id)
              if (!el) {
                throw new Error(`Missing test element #${id}`)
              }
              const style = getComputedStyle(el)
              return [
                id,
                {
                  translate: style
                    .getPropertyValue('--ghost-motion-translate')
                    .trim(),
                  pressScale: style
                    .getPropertyValue('--ghost-motion-press-scale')
                    .trim(),
                  transitionDuration: style.transitionDuration,
                },
              ]
            }),
          )
        })

      const beforeMotion = await readMotion()
      expect(beforeMotion['system-nested-dark-probe'].transitionDuration).toBe(
        '0.12s',
      )
      expect(beforeMotion['light-nested-dark-probe'].transitionDuration).toBe(
        '0.12s',
      )

      await page.emulateMedia({ reducedMotion: 'reduce' })
      const reducedMotion = await readMotion()
      expect(reducedMotion).toEqual({
        'system-nested-dark-probe': {
          translate: '0px',
          pressScale: '1',
          transitionDuration: '0.08s',
        },
        'light-nested-dark-probe': {
          translate: '0px',
          pressScale: '1',
          transitionDuration: '0.08s',
        },
        'nested-calm-inherited-probe': {
          translate: '0px',
          pressScale: '1',
          transitionDuration: '0.048s',
        },
      })

      const readColors = () =>
        page.evaluate(() => {
          const ids = [
            'system-nested-dark-probe',
            'light-nested-dark-probe',
            'nested-calm-inherited-probe',
          ]
          return Object.fromEntries(
            ids.map((id) => {
              const el = document.getElementById(id)
              if (!el) {
                throw new Error(`Missing test element #${id}`)
              }
              const style = getComputedStyle(el)
              return [
                id,
                {
                  surfaceBg: style
                    .getPropertyValue('--ghost-surface-bg')
                    .trim(),
                  actionBg: style
                    .getPropertyValue('--ghost-action-primary-bg')
                    .trim(),
                  scrim: style.getPropertyValue('--ghost-scrim').trim(),
                  computedBg: style.backgroundColor,
                },
              ]
            }),
          )
        })

      const beforeForced = await readColors()
      expect(beforeForced['system-nested-dark-probe'].surfaceBg).toBe('#0d1219')
      expect(beforeForced['light-nested-dark-probe'].actionBg).toBe('#60a5fa')
      expect(beforeForced['nested-calm-inherited-probe'].actionBg).toBe(
        '#00b6d4',
      )

      await page.emulateMedia({ forcedColors: 'active' })
      const forcedColors = await readColors()
      for (const probe of Object.values(forcedColors)) {
        expect(probe.surfaceBg.toLowerCase()).toBe('canvas')
        expect(probe.actionBg.toLowerCase()).toBe('buttonface')
        expect(probe.scrim).toBe('transparent')
        expect(probe.computedBg).not.toBe('rgb(96, 165, 250)')
        expect(probe.computedBg).not.toBe('rgb(0, 182, 212)')
      }

      await page.evaluate(() => {
        document.getElementById('gho-148-fixture')?.remove()
      })
    } finally {
      await playground.close()
    }
  })
})
