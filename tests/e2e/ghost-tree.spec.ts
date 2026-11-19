import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

async function openExample(page: Page, url: string, id: string) {
  await page.goto(`${url}/examples.html?id=${encodeURIComponent(id)}`)
  const tree = page.getByRole('tree').first()
  await expect(tree).toBeVisible()
  return tree
}

async function expectNoTreeAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[role="tree"]')
    .analyze()
  expect(results.violations).toEqual([])
}

/** Puts focus on a control just before the tree so `Tab` enters it. */
async function focusBefore(tree: Locator) {
  await tree.evaluate((element) => {
    const before = document.createElement('button')
    before.type = 'button'
    before.textContent = 'Before tree'
    element.before(before)
    before.focus()
  })
}

function treeItem(page: Page, name: string) {
  return page.getByRole('treeitem', { name, exact: true })
}

test.describe('GhostTree @component:GhostTree', () => {
  test('tree/basic: one Tab stop, every documented key, and Axe in both states', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      const tree = await openExample(page, playground.url, 'tree/basic')
      await expect(tree).toHaveAttribute('aria-label', 'Project files')
      await expect(tree.locator('[tabindex="0"]')).toHaveCount(1)
      await expectNoTreeAxeViolations(page)

      // Tab lands on the selected item, the single tab stop.
      await focusBefore(tree)
      await page.keyboard.press('Tab')
      const main = treeItem(page, 'main.ts')
      await expect(main).toBeFocused()
      await expect(main).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('Home')
      const docs = treeItem(page, 'docs')
      await expect(docs).toBeFocused()
      await expect(docs).toHaveAttribute('aria-expanded', 'false')

      await page.keyboard.press('ArrowRight')
      await expect(docs).toHaveAttribute('aria-expanded', 'true')
      await expect(docs).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(treeItem(page, 'readme.md')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      const guides = treeItem(page, 'guides')
      await expect(guides).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await expect(treeItem(page, 'install.md')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(guides).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(guides).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('ArrowLeft')
      await expect(docs).toBeFocused()
      await expectNoTreeAxeViolations(page)
      await page.keyboard.press('ArrowLeft')
      await expect(docs).toHaveAttribute('aria-expanded', 'false')

      // `*` opens every closed sibling branch at this level.
      await page.keyboard.press('*')
      await expect(docs).toHaveAttribute('aria-expanded', 'true')
      await expect(treeItem(page, 'src')).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      await expect(docs).toBeFocused()

      await page.keyboard.press('End')
      const pkg = treeItem(page, 'package.json')
      await expect(pkg).toBeFocused()
      await page.keyboard.press('ArrowUp')
      const router = treeItem(page, 'router.ts')
      await expect(router).toBeFocused()
      await expect(router).toHaveAttribute('aria-selected', 'false')

      await page.keyboard.press('Enter')
      await expect(router).toHaveAttribute('aria-selected', 'true')
      await expect(main).toHaveAttribute('aria-selected', 'false')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press(' ')
      await expect(pkg).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByText('Selected: package.json')).toBeVisible()

      // Typeahead moves focus without selecting.
      await page.keyboard.press('r')
      await expect(treeItem(page, 'readme.md')).toBeFocused()
      await expect(pkg).toHaveAttribute('aria-selected', 'true')

      // Modifier chords stay with the browser and assistive technology.
      for (const chord of ['Alt+ArrowDown', 'Control+ArrowDown', 'Meta+End']) {
        await page.keyboard.press(chord)
        await expect(treeItem(page, 'readme.md')).toBeFocused()
      }

      await page.keyboard.press('Tab')
      await expect(tree.locator(':focus')).toHaveCount(0)
      await page.keyboard.press('Shift+Tab')
      await expect(treeItem(page, 'readme.md')).toBeFocused()
      await expect(tree.locator('[tabindex="0"]')).toHaveCount(1)
    } finally {
      await playground.close()
    }
  })

  test('tree/multi-select: Space toggles independent nodes without modifiers', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      const tree = await openExample(page, playground.url, 'tree/multi-select')
      await expect(tree).toHaveAttribute('aria-multiselectable', 'true')
      await focusBefore(tree)
      await page.keyboard.press('Tab')
      const css = treeItem(page, 'CSS')
      await expect(css).toBeFocused()
      await expect(css).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('ArrowDown')
      const a11y = treeItem(page, 'Accessibility')
      await expect(a11y).toBeFocused()
      // Focus moved; selection did not.
      await expect(a11y).toHaveAttribute('aria-selected', 'false')
      await page.keyboard.press(' ')
      await expect(a11y).toHaveAttribute('aria-selected', 'true')
      await expect(css).toHaveAttribute('aria-selected', 'true')

      await page.keyboard.press('Home')
      const frontend = treeItem(page, 'Frontend')
      await page.keyboard.press(' ')
      await expect(frontend).toHaveAttribute('aria-selected', 'true')
      // Selecting a parent never selects its children.
      await expect(treeItem(page, 'Vue')).toHaveAttribute(
        'aria-selected',
        'false',
      )
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press(' ')
      await expect(css).toHaveAttribute('aria-selected', 'false')
      await expect(
        page.getByText('Selected: a11y, frontend', { exact: false }),
      ).toBeVisible()
      await expectNoTreeAxeViolations(page)
    } finally {
      await playground.close()
    }
  })

  test('tree/split-trigger: chevron only toggles and label only selects', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await openExample(page, playground.url, 'tree/split-trigger')
      const personal = treeItem(page, 'Personal')
      const chevron = page.getByTestId('personal-chevron')
      await expect(personal).toHaveAttribute('aria-expanded', 'false')

      await chevron.click()
      await expect(personal).toHaveAttribute('aria-expanded', 'true')
      await expect(personal).toHaveAttribute('aria-selected', 'false')

      await personal
        .locator('[data-part="trigger"]', { hasText: 'Personal' })
        .click()
      await expect(personal).toHaveAttribute('aria-selected', 'true')
      await expect(personal).toHaveAttribute('aria-expanded', 'true')

      // A click inside a child never selects or collapses the parent.
      await treeItem(page, 'Drafts').locator('[data-part="trigger"]').click()
      await expect(treeItem(page, 'Drafts')).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await expect(personal).toHaveAttribute('aria-selected', 'false')
      await expect(personal).toHaveAttribute('aria-expanded', 'true')
      await expectNoTreeAxeViolations(page)
    } finally {
      await playground.close()
    }
  })

  test('tree/rtl: ArrowLeft expands and enters, ArrowRight returns and collapses', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      const tree = await openExample(page, playground.url, 'tree/rtl')
      await expect(tree).toHaveAttribute('data-dir', 'rtl')
      const reports = treeItem(page, 'التقارير')
      await reports.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(reports).toHaveAttribute('aria-expanded', 'true')
      await expect(reports).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(treeItem(page, 'الربع الأول')).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(reports).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(reports).toHaveAttribute('aria-expanded', 'false')
      await expectNoTreeAxeViolations(page)
    } finally {
      await playground.close()
    }
  })

  test('tree/themed: level indentation, themed hooks, and Axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      const tree = await openExample(page, playground.url, 'tree/themed')
      await expect(tree).toHaveAttribute('data-themed', '')
      const components = treeItem(page, 'Components')
      const button = treeItem(page, 'Button')
      await expect(components).toHaveCSS('--ghost-tree-level', '1')
      await expect(button).toHaveCSS('--ghost-tree-level', '2')
      const padding = async (name: string) =>
        treeItem(page, name)
          .locator(':scope > [data-part="trigger"]')
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).paddingInlineStart),
          )
      expect(await padding('Button')).toBeGreaterThan(
        await padding('Components'),
      )
      await expect(
        page.locator('[data-ghost-tree-value="components/forms/select"]'),
      ).toHaveAttribute('aria-disabled', 'true')
      await components.focus()
      await page.keyboard.press('ArrowDown')
      await expect(button).toBeFocused()
      await expectNoTreeAxeViolations(page)
    } finally {
      await playground.close()
    }
  })

  test('playground: focus recovery on collapse and unmount, DOM-order navigation after reorder', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(playground.url)

      // Collapse an ancestor while a child holds the tab stop.
      const multiple = page.getByTestId('tree-multiple')
      await multiple.scrollIntoViewIfNeeded()
      const reports = multiple.getByRole('treeitem', {
        name: 'Reports',
        exact: true,
      })
      await reports.focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      const q1 = multiple.getByRole('treeitem', { name: 'Q1', exact: true })
      await expect(q1).toBeFocused()
      // Disabled items are skipped.
      await page.keyboard.press('ArrowDown')
      await expect(
        multiple.getByRole('treeitem', { name: 'Invoices', exact: true }),
      ).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(q1).toBeFocused()
      await page.getByTestId('tree-collapse-all').click()
      await expect(reports).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('Shift+Tab')
      await expect(reports).toBeFocused()
      await expect(multiple.locator('[tabindex="0"]')).toHaveCount(1)

      // Remove the focused item: the stop moves to the next item, no selection change.
      const dynamic = page.getByTestId('tree-dynamic')
      const beta = dynamic.getByRole('treeitem', {
        name: 'beta.ts',
        exact: true,
      })
      await beta.focus()
      await page.getByTestId('tree-remove-beta').click()
      await expect(beta).toHaveCount(0)
      const gamma = dynamic.getByRole('treeitem', {
        name: 'gamma.ts',
        exact: true,
      })
      await expect(gamma).toHaveAttribute('tabindex', '0')
      await expect(page.getByTestId('tree-dynamic-value')).toHaveText(
        'Selected: none',
      )

      // Reorder and insert, then navigate in rendered order.
      await page.getByTestId('tree-reverse').click()
      await page.getByTestId('tree-prepend').click()
      await gamma.focus()
      await page.keyboard.press('ArrowDown')
      await expect(
        dynamic.getByRole('treeitem', { name: 'alpha.ts', exact: true }),
      ).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await expect(
        dynamic.getByRole('treeitem', { name: 'new-1.ts', exact: true }),
      ).toBeFocused()

      await expectNoTreeAxeViolations(page)
    } finally {
      await playground.close()
    }
  })
})
