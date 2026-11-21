import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const showcases = [
  { slug: 'accordion', id: 'accordion/deployment-faq' },
  { slug: 'avatar', id: 'avatar/team-roster' },
  { slug: 'badge', id: 'badge/release-channels' },
  { slug: 'breadcrumb', id: 'breadcrumb/workspace-trail' },
  { slug: 'card', id: 'card/project-summary' },
  { slug: 'collapsible', id: 'collapsible/release-notes' },
  { slug: 'empty-state', id: 'empty-state/search-results' },
  { slug: 'interactive-surface', id: 'interactive-surface/feature-tiles' },
  { slug: 'kbd', id: 'kbd/command-shortcuts' },
  { slug: 'link', id: 'link/documentation-footer' },
  { slug: 'progress', id: 'progress/upload-queue' },
  { slug: 'scroll-area', id: 'scroll-area/activity-feed' },
  { slug: 'separator', id: 'separator/release-header' },
  { slug: 'skeleton', id: 'skeleton/profile-loading' },
  { slug: 'spinner', id: 'spinner/sync-status' },
  { slug: 'toolbar', id: 'toolbar/editor-actions' },
  { slug: 'visually-hidden', id: 'visually-hidden/action-bar' },
] as const

const modes = ['light', 'dark'] as const
const widths = [390, 1280] as const

test.describe('Wave 202b docs showcases', () => {
  for (const { slug, id } of showcases) {
    test(`${slug} hero showcase (${id}) passes axe and responsive layout in light and dark`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')

      try {
        for (const mode of modes) {
          await page.addInitScript((appearance) => {
            localStorage.setItem('vitepress-theme-appearance', appearance)
          }, mode)

          for (const width of widths) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto(`${docs.url}/components/${slug}.html`)
            await expect(page.locator('html')).toHaveAttribute(
              'data-ghost-mode',
              mode,
            )

            const frame = page.locator(`[data-example-id="${id}"]`)
            await frame.scrollIntoViewIfNeeded()
            const preview = frame.getByTestId('ghost-example-preview')
            await expect(preview).toBeVisible()

            const overflow = await page.evaluate(() => {
              return (
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth
              )
            })
            expect(overflow).toBeLessThanOrEqual(1)

            if (width === 1280) {
              const results = await new AxeBuilder({ page })
                .include(
                  `[data-example-id="${id}"] [data-testid="ghost-example-preview"]`,
                )
                .analyze()
              expect(results.violations).toEqual([])
            }
          }
        }
      } finally {
        await docs.close()
      }
    })
  }
})
