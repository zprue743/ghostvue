import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of ['/ghost', '/prime']) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForSelector('table')
    const results = await new AxeBuilder({ page })
      .include('table')
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze()
    await test.info().attach(`axe-${route.replace('/', '')}`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    })
    const serious = results.violations.filter(
      (v) => (v.impact === 'critical' || v.impact === 'serious') && v.id !== 'aria-allowed-attr',
    )
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
  })
}