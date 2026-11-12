import type { MaybeRefOrGetter } from 'vue'

/**
 * Closed union: interactive/void tags would break hiding or cannot hold children.
 * Widening is additive; narrowing is breaking.
 */
export type GhostVisuallyHiddenElement =
  'span' | 'div' | 'p' | 'li' | 'td' | 'th'

/** Props for the unstyled {@link GhostVisuallyHidden} component. */
export interface GhostVisuallyHiddenProps {
  /**
   * Root tag valid in the parent context (`th` in a row, `li` in a list).
   * @default 'span'
   */
  as?: GhostVisuallyHiddenElement
  /**
   * Reveal while focus is inside. Required if the slot is focusable (skip links).
   * @default false
   */
  focusable?: boolean
}

/** Options for {@link useGhostVisuallyHidden}. `as` is a render concern of the SFC. */
export interface UseGhostVisuallyHiddenOptions {
  /**
   * Reveal while focus is inside.
   * @default false
   */
  focusable?: MaybeRefOrGetter<boolean | undefined>
}
