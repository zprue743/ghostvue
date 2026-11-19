import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostInput', () => {
  test('types, honors states, submits, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostInput',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const search = page.getByLabel('Search reports')
      await search.fill('forecast')
      await expect(page.getByTestId('input-search-value')).toHaveText(
        'forecast',
      )

      const disabled = page.getByLabel('Disabled filter')
      await expect(disabled).toBeDisabled()

      const readonly = page.getByLabel('Readonly owner')
      await expect(readonly).toHaveAttribute('readonly', '')
      await readonly.focus()
      await expect(readonly).toBeFocused()

      const invalid = page.getByLabel('Invalid query')
      await expect(invalid).toHaveAttribute('aria-invalid', 'true')

      const required = page.getByLabel('Required name')
      await expect(required).toHaveAttribute('required', '')

      await page.getByLabel('Submit name').fill('Priya')
      await page.getByTestId('input-submit').click()
      await expect(page.getByTestId('input-submitted')).toHaveText('Priya')

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="input-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})

test.describe('GhostInput account details example', () => {
  test('validates email live, focuses the first invalid field on save, and keeps layout steady', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(
        `${playground.url}/examples.html?id=input/account-details`,
      )
      const form = page.locator('form')
      const email = page.getByRole('textbox', { name: /Work email/ })
      const status = form.getByRole('status')

      // Seeded without a top-level domain: invalid and described by the error.
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByRole('alert')).toHaveText(
        'Enter an address like name@company.com.',
      )
      const describedBy = (await email.getAttribute('aria-describedby')) ?? ''
      const errorId = await page.getByRole('alert').getAttribute('id')
      expect(describedBy.split(' ')).toContain(errorId)

      // Saving while invalid moves focus to the field that needs attention.
      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(email).toBeFocused()
      await expect(status).toHaveText('')

      // Hover and focus never move or resize the field (outline-only ring).
      const first = page.getByRole('textbox', { name: /First name/ })
      // Offsets are layout positions, so page scroll from focusing is ignored.
      const measure = (): Promise<number[]> =>
        first.evaluate((el: HTMLElement): number[] => {
          const box = el.getBoundingClientRect()
          return [box.width, box.height, el.offsetTop, el.offsetLeft]
        })
      const idle = await measure()
      await first.hover()
      await first.focus()
      expect(await measure()).toEqual(idle)

      // Fixing the address clears the error without a submit.
      await email.fill('ada@analytical-engines.example')
      await expect(email).not.toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByRole('alert')).toHaveCount(0)

      // Readonly stays focusable; disabled is out of the tab order.
      const workspace = page.getByRole('textbox', { name: 'Workspace URL' })
      await expect(workspace).toHaveAttribute('readonly', '')
      await workspace.focus()
      await expect(workspace).toBeFocused()
      await expect(
        page.getByRole('textbox', { name: 'Billing contact' }),
      ).toBeDisabled()

      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(status).toHaveText('Changes saved.')

      const results = await new AxeBuilder({ page }).include('form').analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('stacks the name row and keeps the form inside a 320px viewport', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 320, height: 900 })
      await page.goto(
        `${playground.url}/examples.html?id=input/account-details`,
      )
      const first = page.getByRole('textbox', { name: /First name/ })
      const last = page.getByRole('textbox', { name: 'Last name' })
      const firstBox = await first.boundingBox()
      const lastBox = await last.boundingBox()
      if (!firstBox || !lastBox) throw new Error('missing name fields')
      expect(lastBox.y).toBeGreaterThan(firstBox.y + firstBox.height)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(0)
    } finally {
      await playground.close()
    }
  })
})
