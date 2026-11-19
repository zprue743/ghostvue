/**
 * Calls a consumer listener read from `useAttrs()` (for example
 * `attrs['onClick']`) with `event`.
 *
 * Parts that set `inheritAttrs: false` and bind their own native listener must
 * call the consumer's listener themselves so they control ordering against
 * disabled guards and `preventDefault()` cancellation. Vue normalizes a
 * listener to either one function or an array of functions when several
 * sources (for example `v-on` plus a spread `onClick`) are merged, so both
 * shapes are supported and array entries run in order. Non-function values
 * are ignored rather than thrown on, matching Vue's own listener invocation.
 *
 * Internal helper: not exported from the package entry.
 */
export function invokeAttrHandler(handler: unknown, event: Event): void {
  if (typeof handler === 'function') {
    ;(handler as (event: Event) => void)(event)
  } else if (Array.isArray(handler)) {
    for (const fn of handler) {
      if (typeof fn === 'function') {
        ;(fn as (event: Event) => void)(event)
      }
    }
  }
}
