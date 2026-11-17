import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostCombobox', () => {
  test('keyboard interaction, highlight, multi-toggle, and axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const input = page.getByTestId('combobox-demo-input')
      const content = page.getByTestId('combobox-demo-content')
      await input.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-testid="combobox-demo-section"]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await input.focus()
      await expect(input).toHaveAttribute('aria-expanded', 'false')

      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await expect(input).toHaveAttribute('aria-expanded', 'true')

      const openAxe = await new AxeBuilder({ page })
        .include('[data-testid="combobox-demo-section"]')
        .analyze()
      expect(openAxe.violations).toEqual([])

      const option25 = page.getByRole('option', { name: '25 rows' })
      const option25Id = await option25.getAttribute('id')
      expect(option25Id).toBeTruthy()

      await page.keyboard.press('ArrowDown')
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        option25Id ?? '',
      )

      await page.keyboard.press('ArrowUp')
      const option10 = page.getByRole('option', { name: '10 rows' })
      const option10Id = await option10.getAttribute('id')
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        option10Id ?? '',
      )

      await page.keyboard.press('End')
      const activeAfterEnd = await input.getAttribute('aria-activedescendant')
      const disabledOption = page.getByTestId('combobox-demo-disabled-option')
      const disabledId = await disabledOption.getAttribute('id')
      expect(activeAfterEnd).not.toBe(disabledId)

      await page.keyboard.press('Home')
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        option10Id ?? '',
      )

      await page.keyboard.type('5')
      await expect(input).toHaveValue('5')

      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      const option50 = page.getByRole('option', { name: '50 rows' })
      const option50Id = await option50.getAttribute('id')
      await expect(input).toHaveAttribute(
        'aria-activedescendant',
        option50Id ?? '',
      )

      await page.keyboard.press('Enter')
      await expect(content).toBeHidden()
      await expect(input).toHaveValue('50 rows')

      await input.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(input).toHaveAttribute('aria-expanded', 'false')
      await expect(input).toBeFocused()

      const multiInput = page.getByTestId('combobox-multi-input')
      const multiContent = page.getByTestId('combobox-multi-content')
      await multiInput.focus()
      await page.keyboard.press('ArrowDown')
      await expect(multiContent).toBeVisible()

      const multi25 = page
        .getByTestId('combobox-multi-content')
        .locator('[data-value="25"]')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowDown')
      const multi25Id = await multi25.getAttribute('id')
      await expect(multiInput).toHaveAttribute(
        'aria-activedescendant',
        multi25Id ?? '',
      )
      await page.keyboard.press('Enter')
      await expect(multiContent).toBeVisible()
      await expect(multi25).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('Enter')
      await expect(multi25).toHaveAttribute('aria-selected', 'false')
      await expect(multiContent).toBeVisible()
    } finally {
      await playground.close()
    }
  })

  test('aria-activedescendant follows rendered option order after list changes (GHO-162)', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const input = page.getByTestId('combobox-order-input')
      const content = page.getByTestId('combobox-order-content')
      await input.scrollIntoViewIfNeeded()

      async function expectActive(name: string): Promise<void> {
        const id = await content
          .getByRole('option', { name, exact: true })
          .getAttribute('id')
        expect(id).toBeTruthy()
        await expect(input).toHaveAttribute('aria-activedescendant', id ?? '')
      }

      async function openListbox(): Promise<void> {
        await input.focus()
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()
        await expect(input).toHaveAttribute('aria-expanded', 'true')
      }

      async function closeListbox(): Promise<void> {
        await page.keyboard.press('Escape')
        await expect(content).toBeHidden()
      }

      // Filter + restore: banana re-registers first but renders second.
      await page.getByTestId('combobox-order-filter').click()
      await page.getByTestId('combobox-order-restore').click()
      await openListbox()
      await expectActive('Apple')
      await page.keyboard.press('ArrowDown')
      await expectActive('Banana')
      await page.keyboard.press('ArrowDown')
      await expectActive('Cherry')
      await page.keyboard.press('ArrowDown')
      await expectActive('Apple')
      await page.keyboard.press('End')
      await expectActive('Cherry')
      await page.keyboard.press('Home')
      await expectActive('Apple')
      await page.keyboard.press('ArrowUp')
      await expectActive('Cherry')
      await closeListbox()

      // Keyed reorder.
      await page.getByTestId('combobox-order-reverse').click()
      await openListbox()
      await page.keyboard.press('Home')
      await expectActive('Cherry')
      await page.keyboard.press('ArrowDown')
      await expectActive('Banana')
      await page.keyboard.press('End')
      await expectActive('Apple')
      await closeListbox()

      // Insertion before existing options.
      await page.getByTestId('combobox-order-insert').click()
      await openListbox()
      await page.keyboard.press('Home')
      await expectActive('Apricot')
      await page.keyboard.press('ArrowDown')
      await expectActive('Apple')
      await closeListbox()

      // Disabled options are skipped without breaking DOM order.
      await page.getByTestId('combobox-order-disable').click()
      await openListbox()
      await page.keyboard.press('Home')
      await expectActive('Apple')
      await page.keyboard.press('ArrowDown')
      await expectActive('Banana')
      await page.keyboard.press('ArrowDown')
      await expectActive('Apple')
      await page.keyboard.press('End')
      await expectActive('Banana')
      await closeListbox()

      // Virtualized mounted window scrolling forward and back.
      await page.getByTestId('combobox-order-window-start').click()
      await page.getByTestId('combobox-order-window-later').click()
      await page.getByTestId('combobox-order-window-start').click()
      await openListbox()
      await page.keyboard.press('Home')
      await expectActive('Item 1')
      await page.keyboard.press('ArrowDown')
      await expectActive('Item 2')
      await page.keyboard.press('End')
      await expectActive('Item 4')
      await page.keyboard.press('ArrowUp')
      await expectActive('Item 3')
      await page.keyboard.press('Enter')
      await expect(content).toBeHidden()
      await expect(input).toHaveValue('Item 3')
      await expect(input).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test.describe('focus departure (GHO-166)', () => {
    test('inline content with trigger: Tab, Shift+Tab, external focus, and pointer selection', async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)

        const before = page.getByTestId('combobox-departure-before')
        const after = page.getByTestId('combobox-departure-after')
        const input = page.getByTestId('combobox-departure-input')
        const trigger = page.getByTestId('combobox-departure-trigger')
        const content = page.getByTestId('combobox-departure-content')
        await input.scrollIntoViewIfNeeded()
        await expect(input).toHaveValue('Banana')

        // Tab into the input and type a transient query.
        await before.focus()
        await page.keyboard.press('Tab')
        await expect(input).toBeFocused()
        await page.keyboard.type('ch')
        await expect(content).toBeVisible()
        await expect(input).toHaveAttribute('aria-expanded', 'true')

        // Input -> trigger is an internal move: the list stays open.
        await page.keyboard.press('Tab')
        await expect(trigger).toBeFocused()
        await expect(input).toHaveAttribute('aria-expanded', 'true')
        await expect(content).toBeVisible()

        // Trigger -> outside button leaves the widget: close, no focus
        // restore, and the committed label replaces the transient query.
        await page.keyboard.press('Tab')
        await expect(after).toBeFocused()
        await expect(input).toHaveAttribute('aria-expanded', 'false')
        await expect(trigger).toHaveAttribute('aria-expanded', 'false')
        await expect(content).toBeHidden()
        await expect(input).toHaveValue('Banana')

        // Shift+Tab back in through the trigger to the input, then out.
        await page.keyboard.press('Shift+Tab')
        await expect(trigger).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(input).toBeFocused()
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()
        await page.keyboard.press('Shift+Tab')
        await expect(before).toBeFocused()
        await expect(input).toHaveAttribute('aria-expanded', 'false')
        await expect(content).toBeHidden()

        // Real external (programmatic) focus.
        await input.focus()
        await page.keyboard.type('a')
        await expect(content).toBeVisible()
        await after.evaluate((element: HTMLElement) => {
          element.focus()
        })
        await expect(after).toBeFocused()
        await expect(input).toHaveAttribute('aria-expanded', 'false')
        await expect(content).toBeHidden()
        await expect(input).toHaveValue('Banana')

        // Opening from the trigger and selecting with the pointer are
        // internal: no premature dismissal, selection commits.
        await trigger.click()
        await expect(content).toBeVisible()
        await expect(input).toBeFocused()
        await content.getByRole('option', { name: 'Cherry' }).click()
        await expect(content).toBeHidden()
        await expect(input).toHaveValue('Cherry')
        await expect(input).toBeFocused()

        // Pressing a non-focusable part of the content (a group label) is an
        // internal interaction: focus stays on the input, the list stays open.
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()
        await page.getByTestId('combobox-departure-label').click()
        await expect(content).toBeVisible()
        await expect(input).toHaveAttribute('aria-expanded', 'true')
        await expect(input).toBeFocused()

        // A later keyboard departure still dismisses.
        await after.focus()
        await expect(input).toHaveAttribute('aria-expanded', 'false')
        await expect(content).toBeHidden()
      } finally {
        await playground.close()
      }
    })

    test('portaled content: single and multiple reset the search on departure', async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)

        const single = page.getByTestId('combobox-demo-input')
        const singleContent = page.getByTestId('combobox-demo-content')
        const multi = page.getByTestId('combobox-multi-input')
        const multiContent = page.getByTestId('combobox-multi-content')
        const nextOutside = page.getByTestId('combobox-departure-before')
        await multi.scrollIntoViewIfNeeded()

        // Portaled content lives outside the section that holds the input.
        await multi.focus()
        await page.keyboard.press('ArrowDown')
        await expect(multiContent).toBeVisible()
        expect(
          await multiContent.evaluate(
            (element) =>
              document
                .querySelector('[data-testid="combobox-demo-section"]')
                ?.contains(element) ?? true,
          ),
        ).toBe(false)
        await page.keyboard.press('Escape')
        await expect(multiContent).toBeHidden()

        // Multiple: pointer toggles keep the list open and focus on the input.
        await multi.focus()
        await page.keyboard.press('ArrowDown')
        await expect(multiContent).toBeVisible()
        const multi25 = multiContent.getByRole('option', { name: '25 rows' })
        await multi25.click()
        await expect(multi25).toHaveAttribute('aria-selected', 'true')
        await expect(multiContent).toBeVisible()
        await expect(multi).toBeFocused()

        // Tab out of the multiple combobox: closed, empty search, selection kept.
        await page.keyboard.type('5')
        await expect(multi).toHaveValue('5')
        await page.keyboard.press('Tab')
        await expect(nextOutside).toBeFocused()
        await expect(multi).toHaveAttribute('aria-expanded', 'false')
        await expect(multiContent).toBeHidden()
        await expect(multi).toHaveValue('')
        await multi.focus()
        await page.keyboard.press('ArrowDown')
        await expect(multi25).toHaveAttribute('aria-selected', 'true')

        // Shift+Tab from the multiple combobox to the single one.
        await page.keyboard.press('Shift+Tab')
        await expect(single).toBeFocused()
        await expect(multi).toHaveAttribute('aria-expanded', 'false')
        await expect(multiContent).toBeHidden()

        // Single portaled: external focus resets to the committed label.
        await page.keyboard.type('10')
        await expect(singleContent).toBeVisible()
        await expect(single).toHaveValue('10')
        await nextOutside.evaluate((element: HTMLElement) => {
          element.focus()
        })
        await expect(nextOutside).toBeFocused()
        await expect(single).toHaveAttribute('aria-expanded', 'false')
        await expect(singleContent).toBeHidden()
        await expect(single).toHaveValue('25 rows')
      } finally {
        await playground.close()
      }
    })

    test('controlled open rejection keeps the parent-owned open state', async ({
      page,
    }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)

        const input = page.getByTestId('combobox-pinned-input')
        const content = page.getByTestId('combobox-pinned-content')
        const release = page.getByTestId('combobox-pinned-release')
        const rejections = page.getByTestId('combobox-pinned-rejections')
        await input.scrollIntoViewIfNeeded()

        await input.focus()
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()
        await expect(input).toHaveAttribute('aria-expanded', 'true')

        await page.keyboard.press('Tab')
        await expect(release).toBeFocused()
        await expect(rejections).toHaveText('1')
        await expect(input).toHaveAttribute('aria-expanded', 'true')
        await expect(content).toBeVisible()

        const openAxe = await new AxeBuilder({ page })
          .include('[data-testid="combobox-demo-section"]')
          .analyze()
        expect(openAxe.violations).toEqual([])

        await release.click()
        await expect(content).toBeHidden()
        await expect(input).toHaveAttribute('aria-expanded', 'false')
      } finally {
        await playground.close()
      }
    })
  })
})
