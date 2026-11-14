import { ghostExamples } from '../../examples/registry'
import { axeScan, expectNoAxeViolations } from '../support/axe'
import { playgroundTest as test, expect } from '../support/playground'

const modes = ['light', 'dark'] as const

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
      await expect(page.getByRole('link', { name: example.id })).toBeVisible()
    }

    await expectNoAxeViolations(page)
  })
})
