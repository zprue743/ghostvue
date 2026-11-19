import { ghostExamples } from '../../examples/registry'
import {
  axeScan,
  expectNoAxeViolations,
  waitForExamplePreview,
} from '../support'
import { playgroundTest as test, expect } from '../support/playground'

const modes = ['light', 'dark'] as const

/**
 * Parts and widgets whose only job is to paint. Headless components ship no
 * visuals, so an example that forgets consumer CSS renders these as a 0px box
 * that a screenshot cannot show and a pointer cannot hit.
 */
const PAINT_SELECTOR = [
  "[data-part='track']",
  "[data-part='thumb']",
  "[data-part='range']",
  "[data-part='indicator']",
  "[role='slider']",
  "[role='switch']",
  "[role='separator']",
  "[role='progressbar']",
  '.ghost-spinner',
].join(', ')

/**
 * Themed overlays whose trigger is a plain element the example leaves
 * unstyled: the recipe-scoped content mounts only while open. Their open
 * state is themed-checked in the docs and component specs.
 */
const closedOverlayExamples = new Set([
  'context-menu/themed',
  'hover-card/themed',
  'tooltip/themed',
])

test.describe('registered examples accessibility', () => {
  for (const example of ghostExamples) {
    for (const mode of modes) {
      test(`${example.id} has no axe violations in ${mode} mode`, async ({
        page,
        playgroundUrl,
      }) => {
        await axeScan(page, playgroundUrl, example.id, { mode })
      })
    }
  }

  test('gallery lists every registered example without axe violations', async ({
    page,
    playgroundUrl,
  }) => {
    await page.goto(`${playgroundUrl}/examples.html`)
    await expect(
      page.getByRole('heading', { name: 'GhostVue examples' }),
    ).toBeVisible()

    for (const example of ghostExamples) {
      await expect(
        page.getByRole('link', { name: example.id, exact: true }),
      ).toBeVisible()
    }

    await expectNoAxeViolations(page)
  })
})

test.describe('registered examples on the docs-equivalent host', () => {
  for (const example of ghostExamples) {
    test(`${example.id} keeps its ${example.layer} boundary and paints every visual part`, async ({
      page,
      playgroundUrl,
    }) => {
      const preview = await waitForExamplePreview(
        page,
        playgroundUrl,
        example.id,
      )

      const report = await preview.evaluate((element, paintSelector) => {
        const root = document.documentElement
        const stage = element.querySelector(
          '[data-testid="ghost-example-stage"]',
        )
        const isRendered = (node: Element): boolean => {
          const style = getComputedStyle(node)
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !node.closest('[hidden]')
          )
        }
        const zeroSized = [...(stage?.querySelectorAll(paintSelector) ?? [])]
          .filter(isRendered)
          .filter((node) => {
            const box = node.getBoundingClientRect()
            return box.width === 0 || box.height === 0
          })
          .map((node) => {
            const box = node.getBoundingClientRect()
            const name =
              node.getAttribute('data-part') ??
              node.getAttribute('role') ??
              node.className
            return `${node.tagName.toLowerCase()}[${name}] ${String(box.width)}x${String(box.height)}`
          })
        return {
          hostTheme: root.getAttribute('data-ghost-theme'),
          hostDensity: root.getAttribute('data-ghost-density'),
          globalRecipes: element.closest('.ghost-theme') !== null,
          // Document-wide so portaled overlay content counts too.
          recipeScopes: document.querySelectorAll(
            '.ghost-theme, .ghost-themed-scope, [data-themed]',
          ).length,
          paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
          zeroSized,
        }
      }, PAINT_SELECTOR)

      // Same token host as the docs first paint: calm, density left unset.
      expect(report.hostTheme).toBe('calm')
      expect(report.hostDensity).toBeNull()
      // Recipes are opted into per example, never by the host.
      expect(report.globalRecipes).toBe(false)
      if (example.layer === 'headless') {
        expect(report.recipeScopes).toBe(0)
      } else if (!closedOverlayExamples.has(example.id)) {
        expect(report.recipeScopes).toBeGreaterThan(0)
      }
      // The canvas has its own inset, so edge shadows and rings are captured.
      expect(report.paddingTop).toBeGreaterThan(0)
      expect(report.zeroSized, 'visual parts with an empty box').toEqual([])
    })
  }
})
