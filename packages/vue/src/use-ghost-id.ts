import {
  computed,
  toValue,
  useId,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'

/** Same token as CSS/tokens; avoids Shoelace's `sl-` custom-element namespace. */
const DEFAULT_PREFIX = 'ghost'

/**
 * SSR-stable DOM id from Vue 3.5 `useId()`. A non-empty `id` wins; default prefix is `ghost`.
 * `useId()` always runs so Vue's per-instance counter cannot drift under SSR.
 */
export function useGhostId(
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
