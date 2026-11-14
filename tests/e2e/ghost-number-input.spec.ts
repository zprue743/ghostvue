import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

test('GhostNumberInput steps with the keyboard in the basic example', async ({
  page,
  playgroundUrl,
}) => {
  await page.goto(`${playgroundUrl}/examples.html?id=number-input/basic`)
  const spinbutton = page.getByLabel('Rows per page')
  await spinbutton.click()
  await spinbutton.press('ArrowUp')
  await expect(spinbutton).toHaveAttribute('aria-valuenow', '30')
  await expectNoAxeViolations(page)
})
