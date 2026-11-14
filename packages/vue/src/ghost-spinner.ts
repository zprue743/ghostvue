import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

/**
 * Unstyled {@link GhostSpinner} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full span contract for consumers.
 */
export interface GhostSpinnerProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * Status message rendered as visually hidden live-region content.
   * `role="status"` takes its accessible name from the author, so this string
   * is what assistive technology announces, not `aria-label`.
   * @default 'Loading'
   */
  label?: string
}

/** Options for {@link useGhostSpinner}. */
export interface UseGhostSpinnerOptions {
  /**
   * Status message. Defaults to `'Loading'`.
   * @default 'Loading'
   */
  label?: MaybeRefOrGetter<string | undefined>
}
