import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

const sectionIds = [
  'hero',
  'layers',
  'progression',
  'theming',
  'components',
  'tooling',
  'get-started',
] as const

type SectionId = (typeof sectionIds)[number]

const DESKTOP = { width: 1440, height: 900 }

/** Opens the built home page and closes its static server afterwards. */
async function withLanding(
  page: Page,
  run: () => Promise<void>,
): Promise<void> {
  const docs = await startStaticServer('apps/docs/.vitepress/dist')
  try {
    await page.goto(`${docs.url}/index.html`)
    await expect(page.locator('.ghost-landing')).toBeVisible()
    await run()
  } finally {
    await docs.close()
  }
}

function rail(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Page sections' })
}

function railLink(page: Page, id: SectionId): Locator {
  return page.getByTestId(`landing-rail-${id}`)
}

/** Scrolls natively (no rail involved) so a section sits at a chosen offset. */
async function scrollSection(
  page: Page,
  id: SectionId,
  block: ScrollLogicalPosition,
): Promise<void> {
  await page.evaluate(
    ([sectionId, position]) => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: 'instant', block: position })
    },
    [id, block] as const,
  )
}

/** Places the section's top edge `offset` px below the top of the viewport. */
async function scrollSectionTopTo(
  page: Page,
  id: SectionId,
  offset: number,
): Promise<void> {
  await page.evaluate(
    ([sectionId, topOffset]) => {
      const section = document.getElementById(sectionId)
      if (!section) return
      const top = section.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: top - topOffset, behavior: 'instant' })
    },
    [id, offset] as const,
  )
}

async function opacityOf(locator: Locator): Promise<number> {
  return locator.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity),
  )
}

async function currentRailIds(page: Page): Promise<string[]> {
  return rail(page)
    .locator('[aria-current]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )
}

test.describe('docs landing page', () => {
  test('home GhostLanding passes axe', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    // Reduced motion shows every section in its final state, so axe checks
    // contrast on settled content instead of mid-fade text.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await withLanding(page, async () => {
      const axe = await new AxeBuilder({ page })
        .include('.ghost-landing')
        .analyze()
      expect(axe.violations).toEqual([])
    })
  })

  test('every component category showcase passes axe', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await withLanding(page, async () => {
      const components = page.locator('#components')
      const tabs = components
        .getByRole('tablist', { name: 'Component categories' })
        .getByRole('tab')
      const count = await tabs.count()
      expect(count).toBeGreaterThan(1)

      for (let index = 0; index < count; index += 1) {
        const tab = tabs.nth(index)
        await tab.click()
        await expect(tab).toHaveAttribute('aria-selected', 'true')
        await expect(components.getByRole('tabpanel')).toHaveCount(1)
        // Each category links into the catalogue.
        await expect(
          components.getByRole('tabpanel').getByRole('link').first(),
        ).toHaveAttribute('href', /^\/components\//)
        const axe = await new AxeBuilder({ page })
          .include('#components')
          .analyze()
        expect(axe.violations).toEqual([])
      }
    })
  })

  test('progression GhostTabs exposes tabpanel and arrow keys move focus', async ({
    page,
  }) => {
    await withLanding(page, async () => {
      const progression = page.locator('#progression')
      await progression.scrollIntoViewIfNeeded()

      const list = progression.getByRole('tablist', {
        name: 'Progressive escape hatch examples',
      })
      const triggers = list.getByRole('tab')
      await expect(triggers).toHaveCount(4)

      const panels = progression.getByRole('tabpanel')
      await expect(panels).toHaveCount(1)

      await triggers.first().focus()
      await page.keyboard.press('ArrowDown')
      await expect(triggers.nth(1)).toBeFocused()
    })
  })

  test('headless and themed stages swap together', async ({ page }) => {
    await withLanding(page, async () => {
      const layers = page.locator('#layers')
      await layers.scrollIntoViewIfNeeded()
      const headless = layers.locator('[data-landing-layer="headless"]')
      const themed = layers.locator('[data-landing-layer="themed"]')
      await expect(headless.getByRole('tablist')).toBeVisible()
      await expect(themed.getByRole('tablist')).toBeVisible()

      // GhostSegmentedControl is a toggle-button group, not a radio group.
      const picker = layers.getByRole('group', {
        name: 'Component to compare',
      })
      const switchOption = picker.getByRole('button', { name: 'Switch' })
      await switchOption.click()
      await expect(switchOption).toHaveAttribute('aria-pressed', 'true')

      await expect(headless.getByRole('switch')).toHaveCount(1)
      await expect(themed.getByRole('switch').first()).toBeVisible()
      await expect(headless).toContainText(
        "import { GhostSwitch } from '@ghostvue/vue'",
      )
      await expect(themed).toContainText(
        "import { GhostSwitch } from '@ghostvue/themes'",
      )
    })
  })

  test('theming controls switch the flagship theme and appearance', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await page.emulateMedia({ colorScheme: 'light' })
    await withLanding(page, async () => {
      const theming = page.locator('#theming')
      await theming.scrollIntoViewIfNeeded()
      const root = page.locator('html')

      const vibrant = theming
        .getByRole('group', { name: 'Flagship theme' })
        .getByRole('button', { name: 'Vibrant' })
      await vibrant.click()
      await expect(vibrant).toHaveAttribute('aria-pressed', 'true')
      await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
      // The nav switcher reads the same state.
      await expect(
        page.getByTestId('docs-theme-vibrant').first(),
      ).toHaveAttribute('aria-checked', 'true')

      const dark = theming.getByRole('switch', { name: 'Dark appearance' })
      await expect(dark).toHaveAttribute('aria-checked', 'false')
      await dark.click()
      await expect(root).toHaveClass(/dark/)
      await expect(root).toHaveAttribute('data-ghost-mode', 'dark')
      await expect(dark).toHaveAttribute('aria-checked', 'true')
    })
  })

  test.describe('section rail', () => {
    test.use({ viewport: DESKTOP })

    test('is labelled navigation with one link per section', async ({
      page,
    }) => {
      await withLanding(page, async () => {
        await expect(rail(page)).toBeVisible()
        const links = rail(page).getByRole('link')
        await expect(links).toHaveCount(sectionIds.length)
        for (const id of sectionIds) {
          await expect(railLink(page, id)).toHaveAttribute('href', `#${id}`)
          await expect(page.locator(`#${id}`)).toHaveCount(1)
        }
        await expect(
          rail(page).getByRole('link', { name: 'Theming' }),
        ).toHaveCount(1)
      })
    })

    test('tracks the active section while scrolling in both directions', async ({
      page,
    }) => {
      await withLanding(page, async () => {
        await expect(railLink(page, 'hero')).toHaveAttribute(
          'aria-current',
          'location',
        )
        expect(await currentRailIds(page)).toEqual(['#hero'])

        await scrollSection(page, 'theming', 'start')
        await expect(railLink(page, 'theming')).toHaveAttribute(
          'aria-current',
          'location',
        )
        // Exactly one marker is current at a time.
        await expect.poll(() => currentRailIds(page)).toEqual(['#theming'])

        await page.evaluate(() => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'instant',
          })
        })
        await expect.poll(() => currentRailIds(page)).toEqual(['#get-started'])

        await scrollSection(page, 'layers', 'start')
        await expect.poll(() => currentRailIds(page)).toEqual(['#layers'])

        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' })
        })
        await expect.poll(() => currentRailIds(page)).toEqual(['#hero'])
      })
    })

    test('clicking a marker scrolls to its section', async ({ page }) => {
      await withLanding(page, async () => {
        const components = page.locator('#components')
        await expect(components).not.toBeInViewport()

        await railLink(page, 'components').click()

        await expect(page).toHaveURL(/#components$/)
        await expect(components).toBeInViewport()
        await expect(railLink(page, 'components')).toHaveAttribute(
          'aria-current',
          'location',
        )
        // The section lands just under the fixed nav, not behind it.
        await expect
          .poll(async () => {
            const box = await components.boundingBox()
            return Math.round(box?.y ?? -1)
          })
          .toBe(64)
      })
    })

    test('is keyboard operable: Tab moves between markers and Enter navigates', async ({
      page,
    }) => {
      await withLanding(page, async () => {
        await railLink(page, 'hero').focus()
        await expect(railLink(page, 'hero')).toBeFocused()

        await page.keyboard.press('Tab')
        await expect(railLink(page, 'layers')).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(railLink(page, 'progression')).toBeFocused()
        // Labels are revealed for keyboard users, not only on hover.
        await expect(
          railLink(page, 'progression').locator('.ghost-landing-rail__label'),
        ).toHaveCSS('opacity', '1')

        await page.keyboard.press('Shift+Tab')
        await expect(railLink(page, 'layers')).toBeFocused()

        await page.keyboard.press('Enter')
        const layers = page.locator('#layers')
        // Focus follows the viewport so the next Tab continues in the section.
        await expect(layers).toBeFocused()
        await expect(layers).toBeInViewport()
        await expect(railLink(page, 'layers')).toHaveAttribute(
          'aria-current',
          'location',
        )

        await page.keyboard.press('Tab')
        await expect(
          layers.getByRole('button', { name: 'Tabs', exact: true }),
        ).toBeFocused()
      })
    })

    test('ghost leans into the scroll direction and settles when it stops', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        const landing = page.locator('.ghost-landing')
        const lean = page.locator('.ghost-landing-rail__lean')
        await expect(landing).not.toHaveAttribute('data-landing-travel')
        await expect(lean).toHaveCSS('transform', 'none')

        // The travel mark only lasts while the page moves, so record every
        // value it takes instead of racing a single read against it.
        await landing.evaluate((element) => {
          const seen: string[] = []
          Object.assign(window, { landingTravelLog: seen })
          new MutationObserver(() => {
            seen.push(element.getAttribute('data-landing-travel') ?? 'idle')
          }).observe(element, {
            attributes: true,
            attributeFilter: ['data-landing-travel'],
          })
        })
        const travelLog = () =>
          page.evaluate(
            () =>
              (window as unknown as { landingTravelLog: string[] })
                .landingTravelLog,
          )

        await page.evaluate(() => {
          window.scrollTo({ top: 600, behavior: 'instant' })
        })
        await expect.poll(travelLog).toEqual(['down', 'idle'])
        await page.evaluate(() => {
          window.scrollTo({ top: 200, behavior: 'instant' })
        })
        await expect.poll(travelLog).toEqual(['down', 'idle', 'up', 'idle'])

        // While travelling the ghost is tilted; idle, it is upright again.
        await landing.evaluate((element) => {
          element.setAttribute('data-landing-travel', 'down')
        })
        await expect(lean).not.toHaveCSS('transform', 'none')
        await landing.evaluate((element) => {
          element.removeAttribute('data-landing-travel')
        })
        await expect(lean).toHaveCSS('transform', 'none')
      })
    })

    test('hides on narrow viewports without horizontal overflow', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 800 })
      await withLanding(page, async () => {
        await expect(rail(page)).toBeHidden()
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)
      })
    })
  })

  test.describe('section motion', () => {
    test.use({ viewport: DESKTOP })

    test('intro and outro follow scroll position and reverse', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        test.skip(
          !(await page.evaluate(() =>
            CSS.supports('animation-timeline: view()'),
          )),
          'CSS scroll-driven animations are not available in this engine.',
        )
        await expect(page.locator('.ghost-landing')).toHaveAttribute(
          'data-landing-motion',
          'timeline',
        )
        const panel = page.locator('#layers [data-landing-layer="headless"]')
        const pageHeight = () =>
          page.evaluate(() => document.documentElement.scrollHeight)
        const heightAtRest = await pageHeight()

        // Section top just inside the bottom of the viewport: intro pending.
        await scrollSectionTopTo(page, 'layers', DESKTOP.height - 40)
        await expect.poll(() => opacityOf(panel)).toBeLessThan(0.3)

        // Section centred: settled and fully opaque.
        await scrollSection(page, 'layers', 'center')
        await expect.poll(() => opacityOf(panel)).toBe(1)

        // Section almost scrolled away: outro has played.
        await scrollSection(page, 'progression', 'start')
        await scrollSectionTopTo(page, 'progression', 120)
        await expect.poll(() => opacityOf(panel)).toBeLessThan(0.3)

        // Scrolling back replays it in reverse.
        await scrollSection(page, 'layers', 'center')
        await expect.poll(() => opacityOf(panel)).toBe(1)

        // Only transform and opacity move, so the document never resizes.
        expect(await pageHeight()).toBe(heightAtRest)
      })
    })

    test('reduced motion shows every section in its final state', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await withLanding(page, async () => {
        await expect(page.locator('.ghost-landing')).toHaveAttribute(
          'data-landing-motion',
          'static',
        )
        const settled = () =>
          page.locator('.ghost-landing [data-reveal]').evaluateAll((elements) =>
            elements.every((element) => {
              const style = getComputedStyle(element)
              return style.opacity === '1' && style.transform === 'none'
            }),
          )

        expect(await settled()).toBe(true)
        // Same at a position where the motion path would be mid-animation.
        await scrollSectionTopTo(page, 'theming', DESKTOP.height - 40)
        expect(await settled()).toBe(true)

        // The rail still navigates, without smooth scrolling.
        await railLink(page, 'tooling').click()
        await expect(page.locator('#tooling')).toBeInViewport()
        await expect(railLink(page, 'tooling')).toHaveAttribute(
          'aria-current',
          'location',
        )
      })
    })

    test('observer fallback marks section phases where scroll timelines are missing', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      // Report scroll-driven animations as unsupported so the script takes
      // the fallback path even in an engine that has them.
      await page.addInitScript(() => {
        const supports = CSS.supports.bind(CSS)
        CSS.supports = (...args: [string, string?]): boolean => {
          if (args.join(' ').includes('animation-timeline')) return false
          return args.length === 2
            ? supports(args[0], args[1] ?? '')
            : supports(args[0])
        }
      })
      await withLanding(page, async () => {
        await expect(page.locator('.ghost-landing')).toHaveAttribute(
          'data-landing-motion',
          'observer',
        )
        const hero = page.locator('#hero')
        const closing = page.locator('#get-started')
        await expect(hero).toHaveAttribute('data-landing-phase', 'active')
        await expect(closing).toHaveAttribute('data-landing-phase', 'before')

        await page.evaluate(() => {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'instant',
          })
        })
        await expect(hero).toHaveAttribute('data-landing-phase', 'after')
        await expect(closing).toHaveAttribute('data-landing-phase', 'active')

        // Scrolling back reverses the phases.
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' })
        })
        await expect(hero).toHaveAttribute('data-landing-phase', 'active')
        await expect(closing).toHaveAttribute('data-landing-phase', 'before')
      })
    })
  })

  test('content and section links work without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: DESKTOP,
      // Stands in for an engine with no motion at all: nothing may be hidden.
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/index.html`)
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Vue-first, headless-first UI.',
        }),
      ).toBeVisible()
      for (const id of sectionIds) {
        await expect(
          page.locator(`#${id}`).getByRole('heading').first(),
        ).toBeVisible()
      }
      // Live examples are server-rendered, not client-only placeholders.
      await expect(
        page.locator('#hero [data-landing-example]').first(),
      ).toContainText('Release channels')

      await railLink(page, 'tooling').click()
      await expect(page).toHaveURL(/#tooling$/)
      await expect(page.locator('#tooling')).toBeInViewport()
    } finally {
      await context.close()
      await docs.close()
    }
  })
})
