import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * The Dropdown Menu page leads with the `dropdown-menu/record-actions`
 * showcase. These checks cover what a screenshot cannot prove on its own:
 * every documented key with real focus, action outcomes and where focus lands
 * afterwards, the destructive item's distinct color, panel placement near
 * viewport edges (LTR and RTL), themed body-portal surfaces in light and dark,
 * stable hover and focus geometry, and no docs prose styles in example text.
 */
const id = 'dropdown-menu/record-actions'
const modes = ['light', 'dark'] as const

async function openPage(
  page: Page,
  url: string,
  mode: (typeof modes)[number] = 'light',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/dropdown-menu.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  const frame = page.locator(`[data-example-id="${id}"]`)
  await frame.scrollIntoViewIfNeeded()
  return frame
}

function partsOf(page: Page, frame: Locator) {
  const preview = frame.getByTestId('ghost-example-preview')
  const menu = page.getByRole('menu')
  return {
    preview,
    menu,
    trigger: (title: string) =>
      preview.getByRole('button', {
        name: `Actions for ${title}`,
        exact: true,
      }),
    item: (name: string) => menu.getByRole('menuitem', { name, exact: true }),
    names: preview.locator('.briefs__name'),
    status: preview.getByRole('status'),
  }
}

// Retry the first activation until hydration has attached the handlers.
async function openMenu(
  trigger: Locator,
  menu: Locator,
  activate: (trigger: Locator) => Promise<void> = (target) => target.click(),
): Promise<void> {
  await expect(async () => {
    if (await menu.isVisible()) return
    await activate(trigger)
    await expect(menu).toBeVisible({ timeout: 500 })
  }).toPass()
}

test.describe('docs Dropdown Menu record actions showcase', () => {
  test('leads the page and passes axe closed and open in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        await expect(
          page.locator('.vp-doc [data-example-id]').first(),
        ).toHaveAttribute('data-example-id', id)
        await expect(frame).toHaveAttribute('data-example-layer', 'themed')
        const closed = await new AxeBuilder({ page })
          .include(`[data-example-id="${id}"]`)
          .analyze()
        expect(closed.violations).toEqual([])

        const { trigger, menu } = partsOf(page, frame)
        await openMenu(trigger('Spring launch brief'), menu)
        const open = await new AxeBuilder({ page })
          .include('[role="menu"]')
          .analyze()
        expect(open.violations).toEqual([])
        await page.keyboard.press('Escape')
      }
    } finally {
      await docs.close()
    }
  })

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`keeps dark Archive readable throughout opening (${reducedMotion})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.emulateMedia({ reducedMotion })
        const frame = await openPage(page, docs.url, 'dark')
        const { trigger, menu, item } = partsOf(page, frame)
        await page.evaluate(() => {
          // Hold the entrance before it can finish between Playwright calls.
          document.addEventListener('transitionrun', (event) => {
            const target = event.target
            if (
              !(target instanceof Element) ||
              !target.matches('[role="menu"]')
            )
              return
            for (const animation of target.getAnimations()) animation.pause()
          })
        })

        const spring = trigger('Spring launch brief')
        await spring.focus()
        await openMenu(spring, menu, (target) => target.press('Enter'))
        await expect(item('Archive')).toBeVisible()
        const openingProgress = reducedMotion === 'reduce' ? [1] : [0, 0.5, 1]
        await expect
          .poll(() =>
            menu.evaluate((element) =>
              element
                .getAnimations()
                .map((animation) =>
                  animation instanceof CSSTransition
                    ? animation.transitionProperty
                    : animation.constructor.name,
                ),
            ),
          )
          .toEqual(reducedMotion === 'reduce' ? [] : ['scale'])

        for (const progress of openingProgress) {
          await menu.evaluate((element, fraction) => {
            for (const animation of element.getAnimations()) {
              animation.pause()
              const duration =
                animation.effect?.getComputedTiming().activeDuration
              if (typeof duration === 'number')
                animation.currentTime = duration * fraction
            }
          }, progress)
          await expect(menu).toHaveCSS('opacity', '1')
          const result = await new AxeBuilder({ page })
            .include('[role="menu"]')
            .withRules(['color-contrast'])
            .analyze()
          expect(result.violations).toEqual([])
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('supports every documented key with real focus and ARIA state', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, menu, item, names, status } = partsOf(page, frame)
      const spring = trigger('Spring launch brief')

      await spring.focus()
      await openMenu(spring, menu, (target) => target.press('Enter'))
      await expect(spring).toHaveAttribute('aria-expanded', 'true')
      await expect(spring).toHaveAttribute(
        'aria-controls',
        (await menu.getAttribute('id')) ?? '',
      )
      await expect(item('Edit title')).toBeFocused()

      await page.keyboard.press('ArrowDown')
      await expect(item('Duplicate')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(item('Move to drafts')).toBeFocused()
      await page.keyboard.press('End')
      await expect(item('Archive')).toBeFocused()
      // Separators and groups are skipped; arrows wrap at the ends.
      await page.keyboard.press('ArrowDown')
      await expect(item('Edit title')).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(item('Archive')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(item('Edit title')).toBeFocused()
      await page.keyboard.press('a')
      await expect(item('Archive')).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)
      await expect(spring).toHaveAttribute('aria-expanded', 'false')
      await expect(spring).toBeFocused()

      // ArrowUp opens on the last item; Space activates.
      await page.keyboard.press('ArrowUp')
      await expect(item('Archive')).toBeFocused()
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowDown')
      await expect(item('Duplicate')).toBeFocused()
      await page.keyboard.press('Space')
      await expect(menu).toHaveCount(0)
      await expect(spring).toBeFocused()
      await expect(names.nth(1)).toHaveText('Spring launch brief (copy)')
      await expect(status).toHaveText(
        'Duplicated “Spring launch brief” as a draft.',
      )

      // ArrowDown opens on the first item; Enter activates.
      await page.keyboard.press('ArrowDown')
      await expect(item('Edit title')).toBeFocused()
      await page.keyboard.press('Enter')
      const title = frame.getByRole('textbox', { name: 'Brief title' })
      await expect(title).toBeFocused()
      await title.fill('Summer launch brief')
      await page.keyboard.press('Enter')
      await expect(trigger('Summer launch brief')).toBeFocused()
      await expect(status).toHaveText('Renamed to “Summer launch brief”.')
    } finally {
      await docs.close()
    }
  })

  test('archives with a distinct destructive item and undo restores focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, menu, item, names, status, preview } = partsOf(
        page,
        frame,
      )
      await openMenu(trigger('Pricing page refresh'), menu)

      const colors = async (locator: Locator) =>
        locator.evaluate((element) => getComputedStyle(element).color)
      expect(await colors(item('Archive'))).not.toBe(
        await colors(item('Duplicate')),
      )
      await expect(menu.getByRole('separator')).toHaveCount(2)

      const danger = await colors(item('Archive'))
      await item('Archive').click()
      await expect(menu).toHaveCount(0)
      await expect(names).toHaveText([
        'Spring launch brief',
        'Onboarding email series',
      ])
      await expect(status).toHaveText('Archived “Pricing page refresh”.')
      await expect(trigger('Onboarding email series')).toBeFocused()

      await preview.getByRole('button', { name: 'Undo archive' }).click()
      await expect(names).toHaveCount(3)
      await expect(trigger('Pricing page refresh')).toBeFocused()

      // Rows created on the client keep the destructive treatment too.
      await openMenu(trigger('Spring launch brief'), menu)
      await item('Duplicate').click()
      await openMenu(trigger('Spring launch brief (copy)'), menu)
      expect(await colors(item('Archive'))).toBe(danger)
    } finally {
      await docs.close()
    }
  })

  for (const dir of ['ltr', 'rtl'] as const) {
    test(`keeps the panel inside a phone viewport near the edges (${dir})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        const viewport = { width: 320, height: 568 }
        await page.setViewportSize(viewport)
        const frame = await openPage(page, docs.url)
        await page.evaluate((value) => {
          document.documentElement.dir = value
        }, dir)
        const { trigger, menu } = partsOf(page, frame)
        const last = trigger('Onboarding email series')

        // Put the last row's trigger near the bottom edge so the panel flips.
        await last.evaluate((element) => {
          const box = element.getBoundingClientRect()
          window.scrollBy(0, box.bottom - window.innerHeight + 16)
        })
        await openMenu(last, menu)
        const triggerBox = await last.boundingBox()
        const menuBox = await menu.boundingBox()
        if (!triggerBox || !menuBox) throw new Error('unmeasured menu')
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(triggerBox.y)
        expect(menuBox.y).toBeGreaterThanOrEqual(0)
        expect(menuBox.x).toBeGreaterThanOrEqual(0)
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(0)

        await page.keyboard.press('Escape')
        await expect(last).toBeFocused()
      } finally {
        await docs.close()
      }
    })
  }

  test('the body-portaled panel follows light and dark tokens', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const surfaces: Record<string, { bg: string; danger: string }> = {}
      for (const mode of modes) {
        const frame = await openPage(page, docs.url, mode)
        const { trigger, menu, item } = partsOf(page, frame)
        await openMenu(trigger('Spring launch brief'), menu)
        expect(
          await menu.evaluate(
            (element) => element.closest('.ghost-example') === null,
          ),
        ).toBe(true)
        surfaces[mode] = {
          bg: await menu.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
          ),
          danger: await item('Archive').evaluate(
            (element) => getComputedStyle(element).color,
          ),
        }
        expect(surfaces[mode].bg).not.toMatch(
          /^(transparent|rgba\(0, 0, 0, 0\))$/,
        )
        await page.keyboard.press('Escape')
      }
      expect(surfaces.light?.bg).not.toBe(surfaces.dark?.bg)
      expect(surfaces.light?.danger).not.toBe(surfaces.dark?.danger)
    } finally {
      await docs.close()
    }
  })

  test('hover and focus keep geometry and example text keeps its own type', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const frame = await openPage(page, docs.url)
      const { trigger, menu, item, preview } = partsOf(page, frame)
      const spring = trigger('Spring launch brief')

      const idle = await spring.boundingBox()
      await spring.hover()
      expect(await spring.boundingBox()).toEqual(idle)
      await spring.focus()
      expect(await spring.boundingBox()).toEqual(idle)
      const ringFits = await spring.evaluate((element) => {
        const clip = element.closest('.ghost-example')
        if (!clip) return false
        const box = element.getBoundingClientRect()
        const bounds = clip.getBoundingClientRect()
        const room = 6
        return (
          box.left - room >= bounds.left &&
          box.right + room <= bounds.right &&
          box.top - room >= bounds.top
        )
      })
      expect(ringFits).toBe(true)

      // Docs prose margins and heading styles stay out of the card text.
      const heading = await preview
        .getByRole('heading', { level: 2 })
        .evaluate((element) => {
          const computed = getComputedStyle(element)
          return {
            margin: computed.marginBlockStart,
            border: computed.borderTopWidth,
            padding: computed.paddingBlockStart,
          }
        })
      expect(heading).toEqual({ margin: '0px', border: '0px', padding: '0px' })
      const list = await preview.getByRole('list').evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          margin: computed.marginBlockStart,
          padding: computed.paddingInlineStart,
          style: computed.listStyleType,
        }
      })
      expect(list).toEqual({ margin: '0px', padding: '0px', style: 'none' })

      // Moving between items by pointer and keyboard never moves them, and the
      // focus ring stays inside the panel.
      await openMenu(spring, menu)
      await menu.evaluate(async (element) => {
        await Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        )
      })
      const archive = item('Archive')
      const before = await archive.boundingBox()
      await archive.hover()
      expect(await archive.boundingBox()).toEqual(before)
      await page.keyboard.press('End')
      await expect(archive).toBeFocused()
      expect(await archive.boundingBox()).toEqual(before)
      const ringInside = await archive.evaluate((element) => {
        const panel = element.closest('[role="menu"]')
        if (!panel) return false
        const computed = getComputedStyle(element)
        const ring =
          Number.parseFloat(computed.outlineWidth) +
          Number.parseFloat(computed.outlineOffset)
        const box = element.getBoundingClientRect()
        const bounds = panel.getBoundingClientRect()
        return (
          box.left - ring >= bounds.left &&
          box.right + ring <= bounds.right &&
          box.bottom + ring <= bounds.bottom
        )
      })
      expect(ringInside).toBe(true)
    } finally {
      await docs.close()
    }
  })
})
