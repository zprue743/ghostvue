import type { Page } from '@playwright/test'

/**
 * Awaits the macrotask scheduled by `afterNativeFormReset` in the page (matches
 * unit `waitForFormResetDeferral` in `packages/vue/src/form-reset.ts`).
 */
export async function waitForFormResetDeferral(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, 0)
      }),
  )
}
