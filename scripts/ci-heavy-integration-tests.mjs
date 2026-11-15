/**
 * Integration tests that subprocess, scaffold temp workspaces, or run pnpm verify.
 * CI runs these in `verify-integration` parallel to sharded unit coverage.
 */
export const heavyIntegrationTestFiles = [
  'tests/integration/new-component.test.ts',
  'tests/integration/component-manifest-generation.test.ts',
  'tests/integration/verify-component.test.ts',
  'tests/integration/package-boundaries.test.ts',
  'tests/integration/themes-define-packed.test.ts',
  'tests/integration/ghost-codes-production-bundle.test.ts',
  'tests/integration/themes-main-entry-graph.test.ts',
  'tests/integration/vue-type-tests-negative-harness.test.ts',
]
