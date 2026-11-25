/**
 * Integration tests that subprocess, scaffold temp workspaces, or run pnpm verify.
 * CI runs these in `verify-integration` parallel to sharded unit coverage.
 */
export const heavyIntegrationTestFiles = [
  'tests/integration/new-component.test.ts',
  'tests/integration/component-manifest-generation.test.ts',
  'tests/integration/verify-component.test.ts',
  'tests/integration/package-boundaries.test.ts',
  'tests/integration/ghost-codes-production-bundle.test.ts',
  'tests/integration/themes-main-entry-graph.test.ts',
  'tests/integration/vue-type-tests-negative-harness.test.ts',
  'tests/integration/component-registries.test.ts',
  'tests/integration/release-dry-run.test.ts',
  'tests/integration/bundle-tree-shaking.test.ts',
]

/**
 * Integration tests already exercised by `verify-build` (`pnpm exports:check`)
 * on prebuilt/prepacked tarballs. Local `pnpm test` still runs them directly.
 */
export const ciBuildCoveredIntegrationTestFiles = [
  'tests/integration/themes-define-packed.test.ts',
  'tests/integration/mcp-packed-smoke.test.ts',
  'tests/integration/ai-agents-guide-stdio.test.ts',
]
