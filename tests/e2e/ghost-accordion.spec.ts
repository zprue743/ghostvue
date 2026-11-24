import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { waitForExamplePreview } from '../support'

import { startStaticServer } from './static-server'

test.describe('GhostAccordion @component:GhostAccordion', () => {
  test('basic example coordinates single expansion with accessible headings', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=accordion/basic`)

      const first = page.getByRole('button', { name: 'Shipping regions' })
      const second = page.getByRole('button', { name: 'Returns window' })

      await expect(first).toHaveAttribute('aria-expanded', 'true')
      await expect(second).toHaveAttribute('aria-expanded', 'false')

      await second.click()
      await expect(first).toHaveAttribute('aria-expanded', 'false')
      await expect(second).toHaveAttribute('aria-expanded', 'true')

      const results = await new AxeBuilder({ page })
        .include('[data-ghost-accordion]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('arrow keys move focus between accordion triggers', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=accordion/basic`)

      const first = page.getByRole('button', { name: 'Shipping regions' })
      const second = page.getByRole('button', { name: 'Returns window' })

      await first.focus()
      await page.keyboard.press('ArrowDown')
      await expect(second).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(first).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('navigation example keeps tab order and isolates nested headers', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=accordion/navigation`)

      const outerOne = page.getByTestId('accordion-outer-trigger-1')
      const outerTwo = page.getByTestId('accordion-outer-trigger-2')
      const panelLink = page.locator('#accordion-panel-link')
      const nestedTrigger = page.getByTestId('accordion-nested-trigger')

      await expect(outerOne).not.toHaveAttribute('tabindex', '-1')
      await expect(outerTwo).not.toHaveAttribute('tabindex', '-1')

      await outerOne.focus()
      await page.keyboard.press('Tab')
      await expect(panelLink).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(nestedTrigger).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(outerTwo).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('ArrowDown')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(outerOne).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('End')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('Home')
      await expect(outerOne).toBeFocused()

      await outerTwo.focus()
      await page.keyboard.press('ArrowDown')
      await expect(outerOne).toBeFocused()

      await nestedTrigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(nestedTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  // GHO-222: the themed animation shell's `display: grid` used to outrank the
  // UA `[hidden]` rule, so collapsed panels kept a bordered strip of clipped
  // body text. Cover every host the issue names, with and without motion.
  const collapsedHosts = [
    { width: 390, mode: 'light', reducedMotion: 'no-preference' },
    { width: 1280, mode: 'dark', reducedMotion: 'no-preference' },
    { width: 390, mode: 'dark', reducedMotion: 'reduce' },
    { width: 1280, mode: 'light', reducedMotion: 'reduce' },
    {
      width: 1280,
      mode: 'light',
      reducedMotion: 'no-preference',
      forcedColors: 'active',
    },
  ] as const

  for (const host of collapsedHosts) {
    const label = [
      `${String(host.width)}px`,
      host.mode,
      host.reducedMotion === 'reduce' ? 'reduced motion' : 'motion',
      'forcedColors' in host ? 'forced colors' : '',
    ]
      .filter(Boolean)
      .join(', ')

    test(`Collapse all leaves only trigger rows in the deployment FAQ (${label})`, async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.setViewportSize({ width: host.width, height: 900 })
        await page.emulateMedia({
          reducedMotion: host.reducedMotion,
          forcedColors: 'forcedColors' in host ? host.forcedColors : 'none',
        })
        const preview = await waitForExamplePreview(
          page,
          playground.url,
          'accordion/deployment-faq',
          { mode: host.mode },
        )

        await preview.getByRole('button', { name: 'Expand all' }).click()
        const triggers = preview.locator('[data-part="trigger"]')
        const contents = preview.locator('[data-part="content"]')
        await expect(contents).toHaveCount(3)
        for (let index = 0; index < 3; index += 1) {
          await expect(contents.nth(index)).toBeVisible()
        }

        const collapseAll = preview.getByRole('button', {
          name: 'Collapse all',
        })
        await collapseAll.click()

        for (let index = 0; index < 3; index += 1) {
          await expect(triggers.nth(index)).toHaveAttribute(
            'aria-expanded',
            'false',
          )
          const content = contents.nth(index)
          await expect(content).toHaveAttribute('hidden', '')
          await expect(content).toBeHidden()
          await expect(content).toHaveCSS('display', 'none')
          expect(await content.boundingBox()).toBeNull()
        }

        // Body copy is gone from the accessibility tree and from view.
        await expect(
          preview.getByText('Previous container digests remain pinned'),
        ).toBeHidden()
        const tree = await preview.ariaSnapshot()
        expect(tree).not.toContain('Previous container digests')
        expect(tree).not.toContain('Primary edges drain')
        expect(tree).not.toContain('Operator attestations')

        // Each closed item is exactly its trigger row: the next item's header
        // starts where the previous trigger ends, plus only the stack gap.
        const gap = await preview
          .locator('.ghost-accordion')
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).rowGap),
          )
        for (let index = 0; index < 2; index += 1) {
          const current = await triggers.nth(index).boundingBox()
          const next = await triggers.nth(index + 1).boundingBox()
          expect(current).not.toBeNull()
          expect(next).not.toBeNull()
          if (!current || !next) continue
          expect(
            Math.abs(next.y - (current.y + current.height) - gap),
          ).toBeLessThanOrEqual(1)
        }

        // Closed panels leave the tab order: focus moves trigger to trigger.
        await collapseAll.focus()
        await page.keyboard.press('Tab')
        await expect(triggers.nth(0)).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(triggers.nth(1)).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(triggers.nth(2)).toBeFocused()
      } finally {
        await playground.close()
      }
    })
  }

  test('deployment FAQ still animates closing before hiding panels', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const preview = await waitForExamplePreview(
        page,
        playground.url,
        'accordion/deployment-faq',
      )
      const first = preview.locator('[data-part="content"]').first()
      await expect(first).toBeVisible()

      await preview.getByRole('button', { name: 'Collapse all' }).click()
      // `hidden` waits for the height transition; it is not applied at once.
      await expect(first).toHaveAttribute('data-state', 'closed')
      await expect(first).not.toHaveAttribute('hidden', '')
      await expect(first).toHaveAttribute('hidden', '', { timeout: 2_000 })
      await expect(first).toBeHidden()

      await preview.getByRole('button', { name: 'Expand all' }).click()
      await expect(first).toBeVisible()
      await expect(
        preview.getByText('Previous container digests remain pinned'),
      ).toBeVisible()
    } finally {
      await playground.close()
    }
  })
})
