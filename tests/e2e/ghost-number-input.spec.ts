import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

test('GhostNumberInput steps with the keyboard in the basic example', async ({
  page,
  playgroundUrl,
}) => {
  await page.goto(`${playgroundUrl}/examples.html?id=number-input/basic`)
  const spinbutton = page.getByLabel('Rows per page')
  await spinbutton.click()
  await spinbutton.press('ControlOrMeta+a')
  await spinbutton.pressSequentially('50', { delay: 20 })
  await expect(spinbutton).toHaveValue('50')
  await spinbutton.press('ArrowUp')
  await expect(spinbutton).toHaveAttribute('aria-valuenow', '55')
  await expectNoAxeViolations(page)
})

test('GhostNumberInput submits the machine value for de-DE display', async ({
  page,
  playgroundUrl,
}) => {
  await page.goto(`${playgroundUrl}/examples.html?id=number-input/form-locale`)
  const spinbutton = page.getByLabel('Betrag')
  await expect(spinbutton).toHaveValue('1.234,5')
  await spinbutton.fill('2.345,6')
  await page.getByRole('button', { name: 'Senden' }).click()
  await expect(page.getByTestId('amount-submitted')).toHaveText(
    'Submitted: 2345.6',
  )
  await expectNoAxeViolations(page)
})
