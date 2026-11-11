# Testing standard

Tests protect behavior and public contracts so internal implementation can evolve
without rewriting assertions that mirror private structure.

## Test levels

- **Vitest unit tests:** framework-neutral logic, composables where browser layout
  is irrelevant, and regression cases.
- **Vue Test Utils:** component props, emitted events, slots, model contracts, and
  Vue lifecycle behavior.
- **Playwright:** keyboard/focus behavior, browser integration, layout-dependent
  behavior, hydration where relevant, and end-to-end accessibility smoke checks.
- **Automated accessibility:** axe is configured with Playwright. It detects only
  a subset of failures and never replaces semantic, keyboard, focus, or
  assistive-technology reasoning.
- **Type tests:** add compile-time assertions alongside the first public generic
  or inference behavior worth preserving.

Name tests after observable behavior. Avoid reaching into component internals or
asserting exact implementation markup unless that markup is itself a semantic
contract. Keep fixtures narrow. Bug fixes require regression tests whenever
practical.

Run `pnpm test` for unit/integration checks and `pnpm test:e2e` for browser checks.
The normal `pnpm verify` gate excludes browser tests to keep routine local and CI
feedback fast; CI runs the browser job separately after installing Chromium. That
job caches `~/.cache/ms-playwright` by Playwright version and does not run
`playwright install --with-deps`, because GitHub-hosted Ubuntu images already
include Chromium's libraries and apt is a frequent stall.
