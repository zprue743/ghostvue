# Test support helpers

## SSR hydration (Vitest)

`tests/support/ssr-hydration.ts` provides `expectSsrHydration`, which renders with
`vue/server-renderer`, mounts the HTML in jsdom, hydrates with `createSSRApp`, and
asserts that SSR and hydration log no warnings or errors and that `id` values
match. Import it directly (not from `index.ts`, which is Playwright-only).

See `docs/standards/testing.md` and `tests/integration/ssr-hydration.test.ts`.

## Playwright

Shared browser-test utilities for GhostVue e2e specs. Import from
`tests/support` (or `tests/support/index.ts`) instead of duplicating static
server setup and accessibility scans.

## Playground fixture

`playgroundTest` extends `@playwright/test` with a `playgroundUrl` fixture that
starts `apps/playground/dist` via `startStaticServer` and closes it after each
test. Use `gotoPlayground(page, playgroundUrl)` for the composite playground
home. Example previews use `waitForExamplePreview` or `axeScan`.

```typescript
import { expect, gotoPlayground, playgroundTest } from '../support'

playgroundTest('section behavior', async ({ page, playgroundUrl }) => {
  await gotoPlayground(page, playgroundUrl)
  await expect(page.getByRole('heading', { name: 'GhostButton' })).toBeVisible()
})
```

## Keyboard helpers

- `expectFocus(locator)` — assertion wrapper for focused elements.
- `pressSequence(page, ['Tab', 'Shift+Tab', 'Enter'])` — ordered key dispatch.

## Scrollbar helpers

- `classicScrollbarLaunchOptions` — `test.use({ launchOptions })` value that
  shows classic scrollbars in headless Chromium and launches Firefox and WebKit
  (0px overlay scrollbars only) with defaults.
- `expectMeasuredScrollbar(browserName, width)` /
  `expectScrollbarCompensation(paddingRight, width, original)` — per-engine
  scroll-lock assertions. See the cross-browser matrix in
  `docs/standards/testing.md`.

## Accessibility helpers

- `axeScan(page, playgroundUrl, exampleId, { mode?: 'light' | 'dark' })` —
  opens a registered example on the docs-equivalent token host (`default`, unset
  density) in the given mode and asserts zero axe violations.
- `exampleUrl` / `waitForExamplePreview` — lower-level example navigation used
  by registry scans and component specs. Pass `{ theme, density, mode }` to
  pick another token host through the `/examples.html` query; never add
  `.ghost-theme` to `<html>`, which would theme headless examples.

Registry-wide scans live in `tests/e2e/examples.spec.ts`. Visual baselines
(`@visual`) stay in `examples-visual.spec.ts` and are not run twice in CI.
