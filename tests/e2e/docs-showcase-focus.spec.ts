import {
  expect,
  test,
  type ElementHandle,
  type JSHandle,
  type Locator,
  type Page,
} from '@playwright/test'

import { measureFocusChange, type FocusChange } from './focus-appearance'
import { startStaticServer } from './static-server'

/*
 * Cross-showcase focus, contrast, motion and zoom sweep for the ten
 * redesigned component pages. Each showcase spec already proves its own keys,
 * ARIA state and axe results; this file proves what those cannot show one
 * component at a time:
 *
 * - every Tab stop in the showcase, and every item reachable inside its
 *   overlay (including body-portaled lists, menus and panels), paints a focus
 *   indicator whose change from the unfocused rendering reaches 3:1 over at
 *   least a 1 CSS px perimeter, on all four edges (so overflow cannot clip a
 *   side), without moving the control, in light, dark and forced colors;
 * - overlays open and close without motion under `prefers-reduced-motion`;
 * - 200% text (a 32px root font size, which every rem-based token follows)
 *   keeps essential actions inside the frame without page overflow.
 *
 * Indicators are measured from screenshots rather than computed styles
 * because the ring is painted on the element, a `::before`, or a child part,
 * depending on the component (see focus-appearance.ts).
 */

type Walk = 'tab' | 'arrows' | 'activedescendant'

interface Overlay {
  /** The control that opens the overlay, inside the preview. */
  trigger: (preview: Locator) => Locator
  /** Key that opens it from the focused trigger. */
  key: string
  /** The opened surface (portaled to the body for every showcase here). */
  surface: (page: Page) => Locator
  /** How keyboard focus moves between the surface's items. */
  walk: Walk
}

interface Showcase {
  slug: string
  id: string
  overlay?: Overlay
}

const showcases: readonly Showcase[] = [
  { slug: 'button', id: 'button/action-bar' },
  { slug: 'input', id: 'input/account-details' },
  {
    slug: 'dialog',
    id: 'dialog/edit-profile',
    overlay: {
      trigger: (preview) =>
        preview.getByRole('button', { name: 'Edit profile', exact: true }),
      key: 'Enter',
      surface: (page) => page.getByRole('dialog', { name: 'Edit profile' }),
      walk: 'tab',
    },
  },
  {
    slug: 'table',
    id: 'table/team-directory',
    overlay: {
      trigger: (preview) =>
        preview.getByRole('button', { name: /^Actions for Grace Hopper/ }),
      key: 'Enter',
      surface: (page) => page.getByRole('menu'),
      walk: 'arrows',
    },
  },
  {
    slug: 'dropdown-menu',
    id: 'dropdown-menu/record-actions',
    overlay: {
      trigger: (preview) =>
        preview.getByRole('button', { name: /^Actions for / }).first(),
      key: 'Enter',
      surface: (page) => page.getByRole('menu'),
      walk: 'arrows',
    },
  },
  {
    slug: 'select',
    id: 'select/billing-preferences',
    overlay: {
      trigger: (preview) => preview.getByRole('combobox', { name: 'Plan' }),
      key: 'Enter',
      surface: (page) => page.getByRole('listbox'),
      walk: 'arrows',
    },
  },
  {
    slug: 'combobox',
    id: 'combobox/assignee-search',
    overlay: {
      trigger: (preview) => preview.getByRole('combobox', { name: 'Assignee' }),
      key: 'ArrowDown',
      surface: (page) => page.getByRole('listbox'),
      walk: 'activedescendant',
    },
  },
  { slug: 'checkbox', id: 'checkbox/notification-preferences' },
  { slug: 'tabs', id: 'tabs/workspace' },
  {
    slug: 'popover',
    id: 'popover/share-settings',
    overlay: {
      trigger: (preview) =>
        preview.getByRole('button', { name: 'Share', exact: true }),
      key: 'Enter',
      surface: (page) => page.getByRole('dialog', { name: /^Share/ }),
      walk: 'tab',
    },
  },
]

const schemes = [
  { name: 'light', mode: 'light', forcedColors: false },
  { name: 'dark', mode: 'dark', forcedColors: false },
  { name: 'forced colors', mode: 'light', forcedColors: true },
] as const

/** Room for the widest outer ring: 3px width plus a 2px offset, and a spare px. */
const OUTER_RING = 6
/**
 * Round controls (a radio's circle, a switch's pill) still cover about 0.45
 * of each box edge. An edge clipped by overflow keeps only the two ring
 * sides that cross it, about 2 x 3px of the edge, which is under 0.2 for
 * any control at least 32px wide.
 */
const MIN_SIDE_COVERAGE = 0.3

async function openShowcase(
  page: Page,
  url: string,
  showcase: Showcase,
  mode: 'light' | 'dark',
): Promise<Locator> {
  await page.addInitScript((appearance) => {
    localStorage.setItem('vitepress-theme-appearance', appearance)
  }, mode)
  await page.goto(`${url}/components/${showcase.slug}.html`)
  await expect(page.locator('html')).toHaveAttribute('data-ghost-mode', mode)
  // Focus and key handlers attach on hydration; measure the live page.
  await page.waitForLoadState('networkidle')
  const preview = page
    .locator(`[data-example-id="${showcase.id}"]`)
    .getByTestId('ghost-example-preview')
  await preview.scrollIntoViewIfNeeded()
  return preview
}

/** A readable name for failure messages. */
async function describe(handle: JSHandle<Element | null>): Promise<string> {
  return handle.evaluate((element) => {
    if (!element) return '(nothing)'
    const role = element.getAttribute('role') ?? element.tagName.toLowerCase()
    // Native inputs take their name from a <label>, not their own text.
    const labelled =
      element instanceof HTMLInputElement
        ? element.labels?.[0]?.textContent
        : undefined
    const name =
      element.getAttribute('aria-label') ?? labelled ?? element.textContent
    return `${role} "${name.replace(/\s+/g, ' ').trim().slice(0, 32)}"`
  })
}

function problems(label: string, change: FocusChange): string[] {
  const found: string[] = []
  /*
   * At least the area of a 1 CSS px perimeter must change by 3:1. The token
   * ring is 3px, so this only fails when most of it is missing; a 2px bar
   * (WCAG 2.4.13) is not used because inset list rings lose their rounded
   * corners and land just under it while still plainly visible.
   */
  if (change.area < change.perimeter) {
    found.push(
      `${label}: indicator changes ${String(change.area)}px at 3:1, below a 1px perimeter (${String(change.perimeter)}px)`,
    )
  }
  for (const [side, coverage] of Object.entries(change.sides)) {
    if (coverage < MIN_SIDE_COVERAGE) {
      found.push(
        `${label}: indicator covers ${coverage.toFixed(2)} of the ${side} edge (clipped or missing)`,
      )
    }
  }
  if (change.shifted) found.push(`${label}: focus moves or resizes the control`)
  return found
}

/** The element showing focus: real focus, or the combobox's active option. */
async function current(
  page: Page,
  walk: Walk,
): Promise<JSHandle<Element | null>> {
  return page.evaluateHandle((virtual) => {
    const active = document.activeElement
    if (!virtual || !active) return active
    const id = active.getAttribute('aria-activedescendant')
    return id ? document.getElementById(id) : null
  }, walk === 'activedescendant')
}

async function isSame(
  page: Page,
  walk: Walk,
  handle: JSHandle<Element | null>,
): Promise<boolean> {
  const now = await current(page, walk)
  return page.evaluate(([left, right]) => left === right, [
    handle,
    now,
  ] as const)
}

/**
 * Blur leaves nothing focused, a clean baseline outside lists. Programmatic
 * focus after keyboard input keeps :focus-visible, so the ring comes back.
 */
function blurAndRefocus(element: ElementHandle) {
  return {
    away: () =>
      element.evaluate((node) => {
        if (node instanceof HTMLElement) node.blur()
      }),
    back: () =>
      element.evaluate((node) => {
        if (node instanceof HTMLElement) node.focus()
      }),
  }
}

/**
 * Focus the open menu or listbox itself: no item shows focus, the surface
 * stays open (focus never leaves it), and a list with a single enabled item
 * still gets a baseline, which arrow keys could not provide.
 */
function focusSurfaceAndReturn(surface: Locator, element: ElementHandle) {
  return {
    away: () =>
      surface.evaluate((node) => {
        if (!(node instanceof HTMLElement)) return
        if (!node.hasAttribute('tabindex')) {
          node.tabIndex = -1
          node.dataset.focusBaseline = ''
        }
        node.focus()
      }),
    back: async () => {
      await element.evaluate((node) => {
        if (node instanceof HTMLElement) node.focus()
      })
      await surface.evaluate((node) => {
        if (!(node instanceof HTMLElement)) return
        if ('focusBaseline' in node.dataset) {
          node.removeAttribute('tabindex')
          delete node.dataset.focusBaseline
        }
      })
    },
  }
}

/** Every Tab stop inside the preview, in order, measured one by one. */
async function sweepTabStops(page: Page, preview: Locator): Promise<string[]> {
  const found: string[] = []
  // Start the sequential focus point just before the first control.
  await preview.evaluate((element) => {
    if (!(element instanceof HTMLElement)) return
    element.tabIndex = -1
    element.focus()
    element.removeAttribute('tabindex')
  })
  for (let stop = 0; stop < 40; stop += 1) {
    await page.keyboard.press('Tab')
    const handle = await current(page, 'tab')
    const inside = await preview.evaluate(
      (element, active) => active !== null && element.contains(active),
      handle,
    )
    if (!inside) break
    const element = handle.asElement()
    if (!element) break
    const label = await describe(handle)
    expect(
      await element.evaluate((node) => node.matches(':focus-visible')),
      `${label} matches :focus-visible after Tab`,
    ).toBe(true)
    const change = await measureFocusChange(page, element, {
      inflate: OUTER_RING,
      baselines: [blurAndRefocus(element)],
    })
    found.push(...problems(label, change))
  }
  return found
}

/**
 * Open the overlay from the keyboard and measure each item it can focus.
 * Menus and listboxes take their baseline with the surface itself focused
 * (blur would close them); Tab-walked panels blur and refocus, which keeps
 * them open without stepping past the last control. The combobox keeps DOM
 * focus in its input, so its active option is compared with each neighbour
 * active instead.
 */
async function sweepOverlay(
  page: Page,
  preview: Locator,
  overlay: Overlay,
): Promise<string[]> {
  const found: string[] = []
  const trigger = overlay.trigger(preview)
  const surface = overlay.surface(page)
  await expect(async () => {
    if (!(await surface.isVisible())) {
      await trigger.focus()
      await page.keyboard.press(overlay.key)
    }
    await expect(surface).toBeVisible({ timeout: 500 })
  }).toPass()

  const next = overlay.walk === 'tab' ? 'Tab' : 'ArrowDown'
  const previous = overlay.walk === 'tab' ? 'Shift+Tab' : 'ArrowUp'
  if (overlay.walk === 'activedescendant') {
    // The combobox opens without an active option; ArrowDown activates one.
    await page.keyboard.press('ArrowDown')
  }
  const first = await current(page, overlay.walk)
  for (let item = 0; item < 16; item += 1) {
    const handle = await current(page, overlay.walk)
    const element = handle.asElement()
    const inside = await surface.evaluate(
      (node, active) => active !== null && node.contains(active),
      handle,
    )
    if (!element || !inside) break
    const label = `${await describe(handle)} in the open overlay`
    if (overlay.walk !== 'activedescendant') {
      expect(
        await element.evaluate((node) => node.matches(':focus-visible')),
        `${label} matches :focus-visible`,
      ).toBe(true)
    }
    const change = await measureFocusChange(page, element, {
      inflate: OUTER_RING,
      baselines:
        overlay.walk === 'tab'
          ? [blurAndRefocus(element)]
          : overlay.walk === 'arrows'
            ? [focusSurfaceAndReturn(surface, element)]
            : [
                {
                  away: () => page.keyboard.press(next),
                  back: () => page.keyboard.press(previous),
                  covers: 'top',
                },
                {
                  away: () => page.keyboard.press(previous),
                  back: () => page.keyboard.press(next),
                  covers: 'bottom',
                },
              ],
    })
    expect(await surface.isVisible(), `${label}: overlay stays open`).toBe(true)
    found.push(...problems(label, change))
    expect(
      await isSame(page, overlay.walk, handle),
      `${label} regains focus`,
    ).toBe(true)
    await page.keyboard.press(next)
    if (await isSame(page, overlay.walk, first)) break
  }

  await page.keyboard.press('Escape')
  await expect(surface).toBeHidden()
  // Every overlay here returns focus to the control that opened it.
  await expect(trigger).toBeFocused()
  return found
}

test.describe('docs showcase focus indicators', () => {
  for (const showcase of showcases) {
    for (const scheme of schemes) {
      test(`${showcase.id} shows an unclipped 3:1 focus change on every stop in ${scheme.name}`, async ({
        page,
      }) => {
        test.slow()
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          if (scheme.forcedColors) {
            await page.emulateMedia({ forcedColors: 'active' })
          }
          const preview = await openShowcase(
            page,
            docs.url,
            showcase,
            scheme.mode,
          )
          const found = await sweepTabStops(page, preview)
          if (showcase.overlay) {
            found.push(...(await sweepOverlay(page, preview, showcase.overlay)))
          }
          expect(found).toEqual([])
        } finally {
          await docs.close()
        }
      })
    }
  }
})

/** Opens an overlay from its trigger, retrying until hydration is done. */
async function openOverlay(
  page: Page,
  preview: Locator,
  overlay: Overlay,
): Promise<Locator> {
  const trigger = overlay.trigger(preview)
  const surface = overlay.surface(page)
  await expect(async () => {
    if (!(await surface.isVisible())) {
      await trigger.focus()
      await page.keyboard.press(overlay.key)
    }
    await expect(surface).toBeVisible({ timeout: 500 })
  }).toPass()
  return surface
}

const overlayShowcases = showcases.filter(
  (showcase): showcase is Showcase & { overlay: Overlay } =>
    showcase.overlay !== undefined,
)

test.describe('docs showcase overlays under reduced motion', () => {
  for (const showcase of overlayShowcases) {
    test(`${showcase.id} opens and closes without motion`, async ({ page }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const preview = await openShowcase(page, docs.url, showcase, 'light')
        /*
         * Record every animation and transition that starts while the overlay
         * opens, moves focus and closes, with the longest duration the
         * element declares at that moment. Events cover the portaled surface
         * too, since they bubble to the document from wherever it mounts.
         */
        await page.evaluate(() => {
          const seconds = (value: string): number =>
            Math.max(
              0,
              ...value
                .split(',')
                .map((part) =>
                  part.trim().endsWith('ms')
                    ? Number.parseFloat(part) / 1000
                    : Number.parseFloat(part),
                ),
            )
          const log: string[] = []
          ;(window as unknown as { motionLog: string[] }).motionLog = log
          document.addEventListener(
            'animationstart',
            (event) => {
              const style = getComputedStyle(event.target as Element)
              const duration = seconds(style.animationDuration)
              if (duration > 0.01)
                log.push(`${event.animationName} ${String(duration)}s`)
            },
            true,
          )
          document.addEventListener(
            'transitionrun',
            (event) => {
              const style = getComputedStyle(event.target as Element)
              const duration =
                seconds(style.transitionDuration) +
                seconds(style.transitionDelay)
              if (duration > 0.01)
                log.push(`${event.propertyName} ${String(duration)}s`)
            },
            true,
          )
        })
        const surface = await openOverlay(page, preview, showcase.overlay)
        await page.keyboard.press(
          showcase.overlay.walk === 'tab' ? 'Tab' : 'ArrowDown',
        )
        await page.keyboard.press('Escape')
        await expect(surface).toBeHidden()
        await expect(showcase.overlay.trigger(preview)).toBeFocused()
        const motion = await page.evaluate(
          () => (window as unknown as { motionLog: string[] }).motionLog,
        )
        expect(motion).toEqual([])
      } finally {
        await docs.close()
      }
    })
  }
})

/*
 * Browser text zoom scales the default font size, which every rem-based
 * GhostVue and VitePress size follows; a 32px root reproduces 200% text.
 * Controls must stay inside the frame with their labels whole, and nothing
 * may push the page sideways. The table keeps its wide columns inside its
 * own named, focusable scroll region, which the table spec covers.
 */
test.describe('docs showcases at 200% text', () => {
  for (const width of [1280, 768]) {
    for (const showcase of showcases) {
      test(`${showcase.id} keeps every action whole at ${String(width)}px`, async ({
        page,
      }) => {
        const docs = await startStaticServer('apps/docs/.vitepress/dist')
        try {
          await page.setViewportSize({ width, height: 900 })
          await page.addInitScript(() => {
            document.addEventListener('DOMContentLoaded', () => {
              document.documentElement.style.fontSize = '200%'
            })
          })
          const preview = await openShowcase(page, docs.url, showcase, 'light')
          expect(
            await page.evaluate(
              () => getComputedStyle(document.documentElement).fontSize,
            ),
          ).toBe('32px')
          const report = await preview.evaluate((root) => {
            const bounds = root.getBoundingClientRect()
            const found: string[] = []
            const controls = root.querySelectorAll<HTMLElement>(
              'button, input, select, textarea, a[href], [role="combobox"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"]',
            )
            for (const control of controls) {
              // Content inside a scroll region is reached by scrolling it.
              const scroller = control.parentElement?.closest('[role="region"]')
              if (scroller && root.contains(scroller)) continue
              const box = control.getBoundingClientRect()
              if (box.width === 0 && box.height === 0) continue
              const name = (
                control.getAttribute('aria-label') ?? control.textContent
              )
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 32)
              if (box.left < bounds.left - 1 || box.right > bounds.right + 1) {
                found.push(`${name}: outside the frame`)
              }
              const style = getComputedStyle(control)
              const cut =
                control.scrollWidth > control.clientWidth + 1 &&
                style.textOverflow !== 'ellipsis' &&
                !(control instanceof HTMLInputElement)
              if (cut) found.push(`${name}: label overflows its control`)
            }
            return {
              found,
              previewOverflow: root.scrollWidth - root.clientWidth,
              pageOverflow:
                document.documentElement.scrollWidth - window.innerWidth,
            }
          })
          expect(report.found).toEqual([])
          expect(report.previewOverflow).toBeLessThanOrEqual(1)
          expect(report.pageOverflow).toBeLessThanOrEqual(0)

          if (showcase.overlay) {
            const surface = await openOverlay(page, preview, showcase.overlay)
            const box = await surface.boundingBox()
            expect(box).not.toBeNull()
            if (box) {
              expect(box.x).toBeGreaterThanOrEqual(0)
              expect(box.x + box.width).toBeLessThanOrEqual(width)
            }
            await page.keyboard.press('Escape')
            await expect(surface).toBeHidden()
          }
        } finally {
          await docs.close()
        }
      })
    }
  }
})
