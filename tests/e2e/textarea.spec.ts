import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostTextarea', () => {
  test('edits, submits, auto-resizes, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostTextarea',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const notes = page.getByTestId('textarea-headless')
      await expect(notes).toHaveValue('Headless notes.')
      await notes.fill('Updated notes.')
      await expect(notes).toHaveValue('Updated notes.')

      const disabled = page.getByTestId('textarea-disabled')
      await expect(disabled).toBeDisabled()

      const readonly = page.getByTestId('textarea-readonly')
      await expect(readonly).toHaveAttribute('readonly')
      await expect(readonly).not.toBeEditable()

      const invalid = page.getByTestId('textarea-invalid')
      await expect(invalid).toHaveAttribute('aria-invalid', 'true')
      await expect(invalid).toHaveAttribute('required')

      const autoResize = page.getByTestId('textarea-auto-resize')
      const startBox = await autoResize.boundingBox()
      expect(startBox).not.toBeNull()
      await autoResize.fill(
        'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight\nNine\nTen',
      )
      const grownBox = await autoResize.boundingBox()
      expect(grownBox).not.toBeNull()
      expect(grownBox?.height ?? 0).toBeGreaterThan(startBox?.height ?? 0)

      const overflowY = await autoResize.evaluate(
        (element) => getComputedStyle(element).overflowY,
      )
      expect(overflowY).toBe('auto')

      const comment = page.getByTestId('textarea-comment')
      await comment.fill('Looks good')
      await page.getByRole('button', { name: 'Send comment' }).click()
      await expect(page.getByTestId('textarea-comment-sent')).toHaveText(
        'Sent: Looks good',
      )

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="textarea-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
