import type { Locator, Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { docsTest as test, expect } from '../support/docs'
import { waitForExamplePreview } from '../support/examples'
import { exampleSourceBlock, openExampleSource } from './docs-example-source'

/*
 * ScrollSpy guide (#442). The themed article rail leads the page; the headless
 * list and composable demos sit under "Advanced: custom layout". These checks
 * drive the lead the way a reader does: activate a section link by keyboard,
 * confirm the destination and the active link, then scroll the article panel
 * to another section, at a phone and a desktop width in light and dark.
 */

const leadId = 'scroll-spy/themed'
const modes = ['light', 'dark'] as const
const widths = [375, 1280] as const
const sectionTitles = [
  'Plan the rollout',
  'Ship behind a flag',
  'Ramp up traffic',
  'Watch the metrics',
  'Clean up the flag',
] as const

async function openGuide(
  page: Page,
  docsUrl: string,
  mode: (typeof modes)[number],
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${docsUrl}/components/scroll-spy.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  return page.locator(`[data-example-id="${leadId}"]`)
}

/** Only `title` carries `aria-current="location"` among the rail links. */
async function expectActive(rail: Locator, title: string): Promise<void> {
  await expect(rail.locator('a[aria-current="location"]')).toHaveText([title])
  await expect(rail.getByRole('link', { name: title })).toHaveAttribute(
    'data-state',
    'active',
  )
}

/**
 * Keyboard-activates a link, then scrolls the panel to a later section, and
 * checks the destination, focus, hash, and active link at each step.
 */
async function exerciseLead(page: Page, scope: Locator): Promise<void> {
  const rail = scope.getByRole('navigation', { name: 'Article sections' })
  const panel = scope.getByRole('region', { name: 'Roll out a feature flag' })
  await expect(rail.getByRole('link')).toHaveText([...sectionTitles])
  await expectActive(rail, 'Plan the rollout')

  const first = rail.getByRole('link', { name: 'Plan the rollout' })
  await first.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const ramp = rail.getByRole('link', { name: 'Ramp up traffic' })
  await expect(ramp).toBeFocused()
  await page.keyboard.press('Enter')

  const section = page.locator('#rollout-ramp')
  await expect(section).toBeFocused()
  await expect(page).toHaveURL(/#rollout-ramp$/)
  await expectActive(rail, 'Ramp up traffic')
  // The destination lands at the top of the panel, not just somewhere in it.
  const offset = await section.evaluate((element) => {
    const scroller = element.closest('[role="region"]')
    if (!scroller) throw new Error('Missing article panel')
    return (
      element.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    )
  })
  expect(offset).toBeGreaterThanOrEqual(0)
  expect(offset).toBeLessThan(24)

  // Scrolling the panel (not the page) moves the active link with it.
  await panel.evaluate((element) => {
    const target = element.querySelector('#rollout-metrics')
    if (!(target instanceof HTMLElement)) throw new Error('Missing section')
    element.scrollTop +=
      target.getBoundingClientRect().top - element.getBoundingClientRect().top
  })
  await expectActive(rail, 'Watch the metrics')

  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expectActive(rail, 'Clean up the flag')
}

test.describe('ScrollSpy guide', () => {
  test('leads with the themed rail and groups headless demos under Advanced', async ({
    page,
    docsUrl,
  }) => {
    await page.goto(`${docsUrl}/components/scroll-spy.html`)
    const frames = page.locator('[data-example-id^="scroll-spy/"]')
    await expect(frames).toHaveCount(3)
    expect(
      await frames.evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute('data-example-id'),
          node.getAttribute('data-example-layer'),
        ]),
      ),
    ).toEqual([
      ['scroll-spy/themed', 'themed'],
      ['scroll-spy/basic', 'headless'],
      ['scroll-spy/composable', 'headless'],
    ])

    // The old deep links still resolve to the matching sections.
    for (const anchor of ['themed-rail', 'custom-layout', 'basic-navigation']) {
      await expect(page.locator(`h2#${anchor}, h3#${anchor}`)).toHaveCount(1)
    }
    const advanced = page.locator('h2#custom-layout')
    await expect(advanced).toContainText('Advanced: custom layout')
    // Both headless demos follow the Advanced heading.
    expect(
      await advanced.evaluate((heading) =>
        [...document.querySelectorAll('[data-example-layer="headless"]')].every(
          (node) =>
            heading.compareDocumentPosition(node) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ).toBe(true)

    // The source a reader opens and copies is the themed SFC they just used.
    await openExampleSource(page, leadId)
    const source = exampleSourceBlock(page, leadId)
    await expect(source).toContainText("from '@ghostvue/themes'")
    await expect(source).toContainText(':container="article"')
    await expect(source).not.toContainText('@ghostvue/vue')
  })

  for (const width of widths) {
    for (const mode of modes) {
      test(`themed lead navigates by keyboard and scroll at ${String(width)}px in ${mode}`, async ({
        page,
        docsUrl,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const frame = await openGuide(page, docsUrl, mode)
        const preview = frame.getByTestId('ghost-example-preview')
        await frame.scrollIntoViewIfNeeded()

        // Every link stays inside the viewport, and the page does not scroll
        // sideways, at both widths.
        for (const link of await preview.getByRole('link').all()) {
          const box = await link.boundingBox()
          expect(box).not.toBeNull()
          if (box) {
            expect(box.x).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width).toBeLessThanOrEqual(width)
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        ).toBeLessThanOrEqual(0)

        await exerciseLead(page, preview)
        await expectNoAxeViolations(page, {
          include: `[data-example-id="${leadId}"] [data-testid="ghost-example-preview"]`,
        })
      })
    }
  }

  test('themed lead runs in its standalone playground host', async ({
    page,
    playgroundUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const preview = await waitForExamplePreview(page, playgroundUrl, leadId)
    await exerciseLead(page, preview)
    await expectNoAxeViolations(page, {
      include: '[data-testid="ghost-example-preview"]',
    })
  })
})
