# Playwright support helpers

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

## Accessibility helpers

- `axeScan(page, playgroundUrl, exampleId, { mode?: 'light' | 'dark' })` —
  opens a registered example, optionally sets theme mode, and asserts zero axe
  violations.
- `waitForExamplePreview` / `setGhostExampleTheme` — lower-level example
  navigation used by registry scans and component specs.

Registry-wide scans live in `tests/e2e/examples.spec.ts`. Visual baselines
(`@visual`) stay in `examples-visual.spec.ts` and are not run twice in CI.
