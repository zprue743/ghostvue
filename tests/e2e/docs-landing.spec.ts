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

  /*
   * A reader should never see the end of one section and the start of the
   * next as two half pages. Short content is the case that used to slip:
   * the taller the window, the more sections fell short of it. The phone
   * viewport covers the other direction, where content outgrows the page
   * and the minimum must not clip it.
   */
  for (const viewport of [
    { name: 'desktop', ...DESKTOP },
    { name: 'tall desktop', width: 1920, height: 1400 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`every section fills the page below the nav (${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })
      // Final state everywhere: reveal transforms must not skew the boxes.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await withLanding(page, async () => {
        await expect(
          page.locator('.ghost-landing .ghost-example__status'),
        ).toHaveCount(0)

        const navBottom = await page
          .locator('.VPNav')
          .evaluate((nav) => nav.getBoundingClientRect().bottom)
        const pageHeight = viewport.height - navBottom

        for (const id of sectionIds) {
          const section = page.locator(`#${id}`)
          const { height, contentOverflow } = await section.evaluate(
            (element) => ({
              height: element.getBoundingClientRect().height,
              contentOverflow: element.scrollHeight - element.clientHeight,
            }),
          )
          expect(
            height,
            `#${id} is at least one page tall`,
          ).toBeGreaterThanOrEqual(pageHeight - 0.5)
          expect(contentOverflow, `#${id} contains its content`).toBe(0)

          // Parked under the nav, where the rail leaves it, the section
          // covers the rest of the viewport: the next one has not started.
          await scrollSectionTopTo(page, id, navBottom)
          const box = await section.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return { top: rect.top, bottom: rect.bottom }
          })
          expect(Math.abs(box.top - navBottom)).toBeLessThanOrEqual(1)
          expect(box.bottom).toBeGreaterThanOrEqual(viewport.height - 0.5)
        }
      })
    })
  }

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

  test.describe('theme switching', () => {
    const themes = ['default', 'calm', 'vibrant', 'mono'] as const
    const themeLabels = {
      default: 'Default',
      calm: 'Calm',
      vibrant: 'Vibrant',
      mono: 'Mono',
    } as const

    /**
     * Counts `document.startViewTransition` calls on `<html>`, so a test can
     * tell a crossfaded switch from an instant one without timing anything.
     */
    async function countViewTransitions(page: Page): Promise<void> {
      await page.addInitScript(() => {
        if (typeof document.startViewTransition !== 'function') return
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = (
          ...args: Parameters<typeof start>
        ): ReturnType<typeof start> => {
          const root = document.documentElement
          const count = Number(root.dataset.viewTransitions ?? '0')
          root.dataset.viewTransitions = String(count + 1)
          return start(...args)
        }
      })
    }

    test('flagship and appearance switches crossfade', async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await page.emulateMedia({ colorScheme: 'light' })
      await countViewTransitions(page)
      await withLanding(page, async () => {
        const theming = page.locator('#theming')
        await theming.scrollIntoViewIfNeeded()
        const root = page.locator('html')
        // Restoring the theme on load is not a switch and must not animate.
        await expect(root).not.toHaveAttribute('data-view-transitions')

        await theming
          .getByRole('group', { name: 'Flagship theme' })
          .getByRole('button', { name: 'Vibrant' })
          .click()
        await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
        await expect(root).toHaveAttribute('data-view-transitions', '1')

        // The nav switcher shares the helper, so it crossfades too.
        await page.getByTestId('docs-theme-mono').first().click()
        await expect(root).toHaveAttribute('data-ghost-theme', 'mono')
        await expect(root).toHaveAttribute('data-view-transitions', '2')

        await theming.getByRole('switch', { name: 'Dark appearance' }).click()
        await expect(root).toHaveAttribute('data-ghost-mode', 'dark')
        await expect(root).toHaveAttribute('data-view-transitions', '3')
      })
    })

    test('quick switches inside one crossfade end on the last theme', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP)
      await withLanding(page, async () => {
        const theming = page.locator('#theming')
        await theming.scrollIntoViewIfNeeded()
        const group = theming.getByRole('group', { name: 'Flagship theme' })
        // No waiting between clicks: each lands while the previous crossfade
        // is still running, which only works if the page stays clickable.
        await group.getByRole('button', { name: 'Vibrant' }).click()
        await group.getByRole('button', { name: 'Mono' }).click()
        await group.getByRole('button', { name: 'Default' }).click()

        const root = page.locator('html')
        await expect(root).toHaveAttribute('data-ghost-theme', 'default')
        await expect(
          group.getByRole('button', { name: 'Default' }),
        ).toHaveAttribute('aria-pressed', 'true')
        expect(
          await page.evaluate(() => localStorage.getItem('ghost-docs-theme')),
        ).toBe('default')
        // Still the last theme once every crossfade has finished. Only the
        // crossfade's own animations are awaited: the page also runs idle
        // and scroll-driven animations that never finish.
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document
                  .getAnimations()
                  .filter(
                    (item) =>
                      item.effect instanceof KeyframeEffect &&
                      (item.effect.pseudoElement ?? '').startsWith(
                        '::view-transition',
                      ),
                  ).length,
            ),
          )
          .toBe(0)
        await expect(root).toHaveAttribute('data-ghost-theme', 'default')
      })
    })

    test('reduced motion switches the theme without a view transition', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await countViewTransitions(page)
      await withLanding(page, async () => {
        const theming = page.locator('#theming')
        await theming.scrollIntoViewIfNeeded()
        await theming
          .getByRole('group', { name: 'Flagship theme' })
          .getByRole('button', { name: 'Vibrant' })
          .click()
        const root = page.locator('html')
        await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
        await expect(root).not.toHaveAttribute('data-view-transitions')
      })
    })

    test('the page keeps its layout across flagship themes', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP)
      // Instant switches: this measures layout, not the crossfade.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await withLanding(page, async () => {
        const theming = page.locator('#theming')
        await theming.scrollIntoViewIfNeeded()
        await expect(theming.locator('.ghost-example__status')).toHaveCount(0)
        const group = theming.getByRole('group', { name: 'Flagship theme' })

        /*
         * Size and document position of both theming demos, plus the page
         * height. `calm` defaults to compact density and the other flagships
         * to comfortable, so without the page's density pin all of these
         * changed with the theme.
         */
        const measure = () =>
          page.evaluate(() => ({
            demos: Array.from(
              document.querySelectorAll('#theming [data-landing-example]'),
            ).map((element) => {
              const box = element.getBoundingClientRect()
              return {
                top: Math.round(box.top + window.scrollY),
                left: Math.round(box.left),
                width: Math.round(box.width),
                height: Math.round(box.height),
              }
            }),
            pageHeight: document.documentElement.scrollHeight,
          }))

        await group.getByRole('button', { name: themeLabels.calm }).click()
        await expect(page.locator('html')).toHaveAttribute(
          'data-ghost-theme',
          'calm',
        )
        const atCalm = await measure()
        expect(atCalm.demos).toHaveLength(2)

        for (const theme of themes) {
          await group.getByRole('button', { name: themeLabels[theme] }).click()
          await expect(page.locator('html')).toHaveAttribute(
            'data-ghost-theme',
            theme,
          )
          expect(await measure(), `layout under ${theme}`).toEqual(atCalm)
        }
      })
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

  test.describe('hero mark', () => {
    test.use({ viewport: DESKTOP })

    const mark = (page: Page): Locator =>
      page.locator('#hero .ghost-landing-mark')

    test('twirls and winks on arrival and replays on return', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        await expect(mark(page)).toHaveAttribute('data-landing-mark', 'playing')
        // The twirl and the wink are both attached to the mark's subtree.
        const animationNames = () =>
          mark(page).evaluate((element) =>
            element
              .getAnimations({ subtree: true })
              .map((animation) =>
                animation instanceof CSSAnimation
                  ? animation.animationName
                  : '',
              )
              .sort(),
          )
        expect(await animationNames()).toEqual([
          'ghost-landing-mark-twirl',
          'ghost-landing-mark-wink',
        ])
        // Scrolling inside the hero must not restart the sequence.
        await page.evaluate(() => {
          window.scrollTo({ top: 60, behavior: 'instant' })
        })
        await expect(railLink(page, 'hero')).toHaveAttribute(
          'aria-current',
          'location',
        )
        await expect(mark(page)).toHaveAttribute('data-landing-mark', 'playing')

        // Leaving the hero resets the logo to its resting pose.
        await scrollSection(page, 'theming', 'start')
        await expect(mark(page)).not.toHaveAttribute('data-landing-mark')
        expect(await animationNames()).toEqual([])

        // Coming back starts both animations again from the beginning.
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' })
        })
        await expect(mark(page)).toHaveAttribute('data-landing-mark', 'playing')
        await expect
          .poll(animationNames)
          .toEqual(['ghost-landing-mark-twirl', 'ghost-landing-mark-wink'])
      })
    })

    test('ends on the resting pose with one accessible image', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        await expect(mark(page)).toHaveAttribute('data-landing-mark', 'playing')
        await expect(
          page.locator('#hero').getByRole('img', {
            name: 'GhostVue Phantom V logo',
          }),
        ).toHaveCount(1)
        // Nothing fills forwards: once finished, no transform is left over.
        await mark(page).evaluate((element) =>
          Promise.all(
            element
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished),
          ),
        )
        expect(
          await mark(page).evaluate((element) =>
            [
              element.querySelector('.ghost-landing-mark__turn'),
              element.querySelector('.ghost-landing-mark__wink'),
            ].map((part) => (part ? getComputedStyle(part).transform : '')),
          ),
        ).toEqual(['none', 'none'])
      })
    })

    test('stays still under reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await withLanding(page, async () => {
        await expect(page.locator('.ghost-landing')).toHaveAttribute(
          'data-landing-motion',
          'static',
        )
        await expect(mark(page)).not.toHaveAttribute('data-landing-mark')
        expect(
          await mark(page).evaluate(
            (element) => element.getAnimations({ subtree: true }).length,
          ),
        ).toBe(0)

        await scrollSection(page, 'theming', 'start')
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' })
        })
        await expect(railLink(page, 'hero')).toHaveAttribute(
          'aria-current',
          'location',
        )
        await expect(mark(page)).not.toHaveAttribute('data-landing-mark')
      })
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
        const railRoot = page.locator('.ghost-landing-rail')
        const lean = page.locator('.ghost-landing-rail__lean')
        await expect(railRoot).not.toHaveAttribute('data-travel')
        await expect(lean).toHaveCSS('transform', 'none')

        // The travel mark only lasts while the page moves, so record every
        // value it takes instead of racing a single read against it.
        await railRoot.evaluate((element) => {
          const seen: string[] = []
          Object.assign(window, { landingTravelLog: seen })
          new MutationObserver(() => {
            seen.push(element.getAttribute('data-travel') ?? 'idle')
          }).observe(element, {
            attributes: true,
            attributeFilter: ['data-travel'],
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
        await railRoot.evaluate((element) => {
          element.setAttribute('data-travel', 'down')
        })
        await expect(lean).not.toHaveCSS('transform', 'none')
        await railRoot.evaluate((element) => {
          element.removeAttribute('data-travel')
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

  test.describe('section number', () => {
    test.use({ viewport: DESKTOP })

    const sectionNumber = (page: Page): Locator =>
      page.getByTestId('landing-section-number')
    const flaps = (page: Page): Locator =>
      page.locator('.ghost-landing-number__flap')

    test('follows the active section down and back up', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        const number = sectionNumber(page)
        await expect(number).toBeVisible()
        await expect(number).toHaveAttribute('data-value', '01')

        await scrollSection(page, 'theming', 'start')
        await expect(railLink(page, 'theming')).toHaveAttribute(
          'aria-current',
          'location',
        )
        await expect(number).toHaveAttribute('data-value', '04')
        // The flip finishes on its own and leaves no flaps behind.
        await expect(number).not.toHaveAttribute('data-flip')
        await expect(flaps(page)).toHaveCount(0)

        await scrollSection(page, 'layers', 'start')
        await expect(number).toHaveAttribute('data-value', '02')
        await expect(number).not.toHaveAttribute('data-flip')
      })
    })

    test('flips forward going down and backward going up', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await withLanding(page, async () => {
        const number = sectionNumber(page)
        await expect(page.locator('.ghost-landing')).not.toHaveAttribute(
          'data-landing-motion',
          'static',
        )
        // Hold every flip at its first frame so the direction can be read.
        await page.addStyleTag({
          content:
            '.ghost-landing-number__flap { animation-play-state: paused !important; }',
        })

        await scrollSection(page, 'layers', 'start')
        await expect(number).toHaveAttribute('data-flip', 'forward')
        // 01 -> 02: only the digit that changes gets flaps.
        await expect(flaps(page)).toHaveCount(2)

        // Let the held flip finish, then go back up.
        await page.evaluate(() => {
          // Only the flaps: section reveals are scroll-driven and never end.
          for (const animation of document.getAnimations()) {
            const target =
              animation.effect instanceof KeyframeEffect
                ? animation.effect.target
                : null
            if (target?.classList.contains('ghost-landing-number__flap')) {
              animation.finish()
            }
          }
        })
        await expect(number).not.toHaveAttribute('data-flip')
        await scrollSection(page, 'hero', 'start')
        await expect(number).toHaveAttribute('data-flip', 'backward')
      })
    })

    test('is decorative: hidden from assistive technology and the pointer', async ({
      page,
    }) => {
      await withLanding(page, async () => {
        const number = sectionNumber(page)
        await expect(
          page.locator('.ghost-landing-number-layer'),
        ).toHaveAttribute('aria-hidden', 'true')
        await expect(number).toHaveCSS('pointer-events', 'none')
        await expect(number).toHaveCSS('position', 'fixed')
        await expect(
          number.locator('a, button, input, [tabindex]'),
        ).toHaveCount(0)
        // Nothing on the page is hit-tested through to the number.
        const box = await number.boundingBox()
        expect(box).not.toBeNull()
        if (!box) return
        const hitsNumber = await page.evaluate(
          ([x, y]) =>
            document
              .elementFromPoint(x, y)
              ?.closest('.ghost-landing-number-layer') !== null,
          [box.x + box.width / 2, box.y + box.height / 2] as const,
        )
        expect(hitsNumber).toBe(false)
      })
    })

    test('reduced motion swaps the number with no flip', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await withLanding(page, async () => {
        const number = sectionNumber(page)
        await expect(page.locator('.ghost-landing')).toHaveAttribute(
          'data-landing-motion',
          'static',
        )
        await scrollSection(page, 'components', 'start')
        await expect(number).toHaveAttribute('data-value', '05')
        await expect(number).not.toHaveAttribute('data-flip')
        await expect(flaps(page)).toHaveCount(0)
      })
    })

    test('hides where the rail hides', async ({ page }) => {
      await page.setViewportSize({ width: 1000, height: 900 })
      await withLanding(page, async () => {
        await expect(sectionNumber(page)).toBeHidden()
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
      await expect(
        page
          .locator('[data-landing-example="badge/release-channels"]')
          .getByText('Sample data', { exact: true }),
      ).toBeVisible()

      await railLink(page, 'tooling').click()
      await expect(page).toHaveURL(/#tooling$/)
      await expect(page.locator('#tooling')).toBeInViewport()
    } finally {
      await context.close()
      await docs.close()
    }
  })
})
