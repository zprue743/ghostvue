import {
  computed,
  toValue,
  useId,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'

/**
 * Default prefix for generated ids. CSS and tokens already use `slop-*`; using
 * the same token here avoids colliding with Shoelace's `sl-` custom elements.
 */
const DEFAULT_PREFIX = 'slop'

/**
 * Returns a stable DOM id for accessibility wiring (`for`/`id`,
 * `aria-labelledby`, `aria-controls`).
 *
 * Built on Vue 3.5 `useId()`, so a generated value is unique per app and
 * matches across SSR and hydration. Pass `id` when the consumer already chose
 * an identifier; empty string and `undefined` fall back to a generated id.
 *
 * `useId()` is always called, even when an override is present. Skipping it
 * would advance Vue's per-instance counter only on some trees, which can
 * desynchronize later generated ids if the override is missing on one side of
 * an SSR/client render.
 *
 * @param prefix - Namespace prepended to generated ids. Ignored when `id` is a
 *   non-empty string. Default: `'slop'`.
 * @param id - Optional consumer-supplied override.
 */
export function useSlId(
  prefix?: MaybeRefOrGetter<string | undefined>,
  id?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> {
  const generated = useId()

  return computed(() => {
    const override = toValue(id)
    if (override) {
      return override
    }

    const resolvedPrefix = toValue(prefix)
    if (!resolvedPrefix) {
      return `${DEFAULT_PREFIX}-${generated}`
    }
    return `${resolvedPrefix}-${generated}`
  })
}
