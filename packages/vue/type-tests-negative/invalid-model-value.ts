import type { GhostInputProps } from '../src'

/**
 * Intentionally invalid consumer props. {@link ../tsconfig.type-tests-negative.json}
 * typechecks only this folder; vue-tsc must exit non-zero so CI proves regressions
 * are caught (see `scripts/vue-type-tests-negative.mjs`).
 */
const invalidModelType: GhostInputProps = {
  modelValue: 42,
}

void invalidModelType
