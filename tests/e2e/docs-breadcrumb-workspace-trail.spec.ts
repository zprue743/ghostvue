import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

/*
 * Themed "Workspace breadcrumb trail" docs example (GHO-223). The ellipsis
 * composes a popover whose content is portaled to `body`, outside any
 * `.ghost-theme` ancestor. The themed marker never reached that panel or the
 * trigger, so the collapsed parents rendered as transparent, unlayered text
 * over the release header and past the card edge, the trigger kept browser
 * button chrome, and the calm theme's zero `gap-xs` glued separators to
 * links. These checks pin the closed state, the opened layered menu, keyboard
 * reachability, and the header layout at a phone and a desktop width in
 * light and dark, plus forced colors.
 */

const modes = ['light', 'dark'] as const
type Mode = (typeof modes)[number]
const widths = [390, 1280] as const
const viewportHeight = 900
const exampleId = 'breadcrumb/workspace-trail'
const collapsed = ['Engineering', 'Design Systems', 'Tokens'] as const

/** Alpha of a computed color: `rgb()`, `rgba()`, or a slash-alpha function. */
function alphaOf(color: string): number {
  const slash = /\/\s*([\d.]+)(%?)\s*\)$/.exec(color)
  if (slash) {
    const value = Number(slash[1])
    return slash[2] === '%' ? value / 100 : value
  }
  const rgba = /^rgba\((?:[^,]+,){3}\s*([\d.]+)\)$/.exec(color)
  return rgba ? Number(rgba[1]) : 1
}

interface Example {
  frame: Locator
  nav: Locator
  trigger: Locator
  title: Locator
  panel: Locator
}

async function openPage(page: Page, url: string, mode: Mode): Promise<Example> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/breadcrumb.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  await page.evaluate(() => document.fonts.ready)
  const frame = page.locator(`[data-example-id="${exampleId}"]`)
  await expect(frame).toHaveAttribute('data-example-layer', 'themed')
  const preview = frame.getByTestId('ghost-example-preview')
  const nav = preview.getByRole('navigation', { name: 'Project location' })
  const trigger = nav.getByRole('button', { name: 'Show parent folders' })
  // Leave room below the trail so placement is not edge-forced.
  await trigger.evaluate((element) => {
    element.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -200)
  })
  await page.mouse.move(0, 0)
  return {
    frame,
    nav,
    trigger,
    title: preview.getByText('Tokens v2.14.0 release notes'),
    panel: page.locator('.ghost-breadcrumb-ellipsis-content'),
  }
}

/** Opens the ellipsis by keyboard, retrying until hydration attaches handlers. */
async function openMenu({ trigger, panel }: Example): Promise<void> {
  await expect(async () => {
    if (!(await panel.isVisible())) {
      await trigger.focus()
      await trigger.press('Enter')
    }
    await expect(panel).toBeVisible({ timeout: 500 })
  }).toPass()
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0)
}

test.describe('docs breadcrumb workspace trail', () => {
  test('hides collapsed parents when closed and opens them in a layered themed menu at 390 and 1280px in light and dark', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const width of widths) {
        await page.setViewportSize({ width, height: viewportHeight })
        for (const mode of modes) {
          const example = await openPage(page, docs.url, mode)
          const { frame, nav, trigger, title, panel } = example

          // Closed: no menu surface and no collapsed parents on the page.
          await expect(trigger).toHaveAttribute('aria-expanded', 'false')
          await expect(panel).toHaveCount(0)
          for (const name of collapsed) {
            await expect(page.getByRole('link', { name })).toHaveCount(0)
          }
          await expect(nav.locator('[aria-current="page"]')).toHaveText(
            'v2.14.0',
          )

          // Themed trigger and separators: theme font, control height and
          // visible spacing instead of browser button chrome and glued "/".
          const chrome = await nav.evaluate((root) => {
            const button = root.querySelector('button')
            const separator = root.querySelector('[data-part="separator"]')
            const link = separator?.previousElementSibling
            if (!button || !separator || !link) throw new Error('Trail parts.')
            const buttonStyle = getComputedStyle(button)
            return {
              themed: button.hasAttribute('data-themed'),
              buttonFont: buttonStyle.fontFamily,
              listFont: getComputedStyle(
                root.querySelector('[data-part="list"]') ?? root,
              ).fontFamily,
              buttonHeight: button.getBoundingClientRect().height,
              borderStyle: buttonStyle.borderTopStyle,
              separatorGap:
                separator.getBoundingClientRect().left -
                link.getBoundingClientRect().right,
            }
          })
          expect(chrome.themed).toBe(true)
          expect(chrome.buttonFont).toBe(chrome.listFont)
          expect(chrome.buttonHeight).toBeGreaterThanOrEqual(24)
          expect(chrome.borderStyle).not.toBe('outset')
          expect(chrome.separatorGap).toBeGreaterThan(0)

          // The release header sits under the trail, inside the card.
          const [frameBox, navBox, titleBefore] = await Promise.all([
            frame.boundingBox(),
            nav.boundingBox(),
            title.boundingBox(),
          ])
          if (!frameBox || !navBox || !titleBefore) {
            throw new Error('Frame, trail and header must render.')
          }
          expect(titleBefore.y).toBeGreaterThanOrEqual(
            navBox.y + navBox.height - 1,
          )
          for (const box of [navBox, titleBefore]) {
            expect(box.x).toBeGreaterThanOrEqual(frameBox.x)
            expect(box.x + box.width).toBeLessThanOrEqual(
              frameBox.x + frameBox.width,
            )
          }
          await expectNoPageOverflow(page)

          // Open: an opaque, layered panel anchored to the ellipsis.
          await openMenu(example)
          await expect(trigger).toHaveAttribute('aria-expanded', 'true')
          await expect(panel).toHaveAttribute('data-themed', '')
          const surface = await panel.evaluate((element) => {
            const style = getComputedStyle(element)
            const box = element.getBoundingClientRect()
            const hits = [0.25, 0.5, 0.75].map((fraction) =>
              document.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height * fraction,
              ),
            )
            return {
              portaled: element.parentElement === document.body,
              background: style.backgroundColor,
              borderStyle: style.borderTopStyle,
              zIndex: style.zIndex,
              onTop: hits.every((hit) => hit !== null && element.contains(hit)),
            }
          })
          expect(surface.portaled).toBe(true)
          expect(alphaOf(surface.background)).toBe(1)
          expect(surface.borderStyle).toBe('solid')
          expect(Number(surface.zIndex)).toBeGreaterThan(0)
          expect(surface.onTop).toBe(true)

          const [triggerBox, panelBox, titleAfter] = await Promise.all([
            trigger.boundingBox(),
            panel.boundingBox(),
            title.boundingBox(),
          ])
          if (!triggerBox || !panelBox || !titleAfter) {
            throw new Error('Trigger, panel and header must render.')
          }
          // Anchored just below the ellipsis, inside the example card's width.
          expect(
            Math.abs(panelBox.y - (triggerBox.y + triggerBox.height)),
          ).toBeLessThanOrEqual(16)
          expect(panelBox.x).toBeGreaterThanOrEqual(frameBox.x)
          expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
            frameBox.x + frameBox.width,
          )
          // The panel floats over the header without reflowing it.
          expect(titleAfter).toEqual(titleBefore)
          for (const name of collapsed) {
            await expect(panel.getByRole('link', { name })).toBeVisible()
          }
          await expectNoPageOverflow(page)

          await page.keyboard.press('Escape')
          await expect(panel).toHaveCount(0)
          await expect(trigger).toBeFocused()
        }
      }
    } finally {
      await docs.close()
    }
  })

  test('collapsed parents are keyboard reachable from the ellipsis and pass axe open and closed', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const example = await openPage(page, docs.url, 'light')
      const { trigger, panel } = example
      const scan = () =>
        new AxeBuilder({ page })
          .include(`[data-example-id="${exampleId}"]`)
          .include('.ghost-breadcrumb-ellipsis-content')
          .analyze()

      expect((await scan()).violations).toEqual([])

      await openMenu(example)
      // Opening moves focus to the first collapsed parent; Tab walks the rest.
      for (const [index, name] of collapsed.entries()) {
        if (index > 0) await page.keyboard.press('Tab')
        await expect(panel.getByRole('link', { name })).toBeFocused()
      }
      await page.keyboard.press('Shift+Tab')
      await expect(
        panel.getByRole('link', { name: 'Design Systems' }),
      ).toBeFocused()
      expect((await scan()).violations).toEqual([])

      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // Space toggles the disclosure as well as Enter.
      await page.keyboard.press('Space')
      await expect(panel).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
    } finally {
      await docs.close()
    }
  })

  test('keeps the menu bordered, opaque and on top under forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      for (const width of widths) {
        await page.setViewportSize({ width, height: viewportHeight })
        const example = await openPage(page, docs.url, 'light')
        await expect(example.panel).toHaveCount(0)
        await openMenu(example)
        const surface = await example.panel.evaluate((element) => {
          const style = getComputedStyle(element)
          const box = element.getBoundingClientRect()
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          )
          return {
            background: style.backgroundColor,
            border: style.borderTopColor,
            borderStyle: style.borderTopStyle,
            onTop: hit !== null && element.contains(hit),
          }
        })
        expect(alphaOf(surface.background)).toBe(1)
        expect(surface.borderStyle).toBe('solid')
        expect(alphaOf(surface.border)).toBe(1)
        expect(surface.border).not.toBe(surface.background)
        expect(surface.onTop).toBe(true)
        await expectNoPageOverflow(page)
        await page.keyboard.press('Escape')
        await expect(example.panel).toHaveCount(0)
      }
    } finally {
      await docs.close()
    }
  })
})
