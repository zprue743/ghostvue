import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

/**
 * Unstyled {@link GhostProgress} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full div contract for consumers.
 */
export interface GhostProgressProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * Current progress in the same unit as {@link max}. Omit or pass `null` for
   * the indeterminate fallback. Non-finite numbers are treated as unknown.
   * Finite values are clamped to `[0, max]`.
   */
  value?: number | null

  /**
   * Exclusive upper bound of the range. Matches the ARIA `progressbar` default
   * for `aria-valuemax`, not HTML `<progress>` (`1`), because percent-complete
   * is the ordinary upload/table call site.
   * @default 100
   */
  max?: number

  /**
   * Accessible name, applied as `aria-label`. `role="progressbar"` is
   * `nameFrom: author`; contents are presentational and cannot name the widget.
   * Prefer `aria-labelledby` fallthrough when a visible heading already names
   * the task.
   */
  label?: string

  /**
   * Accessible value text (`aria-valuetext`) for determinate instances. When
   * omitted, the default is the rounded percent (`"40%"`). Ignored while
   * indeterminate.
   */
  valueText?: string
}

/** Options for {@link useGhostProgress}. */
export interface UseGhostProgressOptions {
  value?: MaybeRefOrGetter<number | null | undefined>
  max?: MaybeRefOrGetter<number | undefined>
  label?: MaybeRefOrGetter<string | undefined>
  valueText?: MaybeRefOrGetter<string | undefined>
}
