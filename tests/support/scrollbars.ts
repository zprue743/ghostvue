import { expect } from '@playwright/test'
import type {
  LaunchOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test'

/**
 * Worker-scoped `launchOptions` override that turns on classic (space-taking)
 * scrollbars where the engine allows it, for specs that assert scroll-lock
 * `padding-right` compensation.
 *
 * - Chromium: headless hides scrollbars (`hideScrollbars=true`, 0px width) by
 *   default; the Blink setting restores the 15px classic scrollbar.
 * - Firefox and WebKit: `--blink-settings` is rejected at launch ("Unknown
 *   option"), and their headless Linux builds always use 0px overlay
 *   scrollbars, so they launch with defaults. Scroll-lock specs then verify
 *   that no compensation is applied (see `expectScrollbarCompensation`).
 *
 * Use as `test.use({ launchOptions: classicScrollbarLaunchOptions })`.
 */
export const classicScrollbarLaunchOptions: [
  (
    args: PlaywrightWorkerArgs & PlaywrightWorkerOptions,
    use: (options: LaunchOptions) => Promise<void>,
  ) => Promise<void>,
  { scope: 'worker' },
] = [
  async ({ browserName }, use) => {
    await use(
      browserName === 'chromium'
        ? { args: ['--blink-settings=hideScrollbars=false'] }
        : {},
    )
  },
  { scope: 'worker' },
]

/**
 * Asserts the measured root scrollbar width for the current engine. Chromium
 * must expose a classic scrollbar so compensation is really exercised; other
 * engines report the 0px overlay scrollbar documented above.
 */
export function expectMeasuredScrollbar(
  browserName: string,
  scrollbarWidth: number,
): void {
  if (browserName === 'chromium') {
    expect(scrollbarWidth).toBeGreaterThan(0)
  } else {
    expect(scrollbarWidth).toBe(0)
  }
}

/**
 * Asserts scroll-lock `padding-right` compensation: it equals the removed
 * classic scrollbar width, and is left untouched (`originalPaddingRight`) when
 * scrollbars overlay content and removing them cannot shift layout.
 */
export function expectScrollbarCompensation(
  paddingRight: string,
  scrollbarWidth: number,
  originalPaddingRight: string,
): void {
  if (scrollbarWidth > 0) {
    expect(Number.parseFloat(paddingRight)).toBe(scrollbarWidth)
  } else {
    expect(paddingRight).toBe(originalPaddingRight)
  }
}
