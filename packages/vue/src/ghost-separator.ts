import type { MaybeRefOrGetter } from 'vue'

/**
 * Closed union: `hr` is the native thematic break, `div` hosts vertical rules,
 * `li` is valid in a list-shaped menu (`role="menu"`). Widening is additive.
 */
export type GhostSeparatorElement = 'hr' | 'div' | 'li'

/** Axis of the divider line. */
export type GhostSeparatorOrientation = 'horizontal' | 'vertical'

/** Props for the unstyled {@link GhostSeparator} component. */
export interface GhostSeparatorProps {
  /**
   * Root tag valid in the parent context (`li` in a list). Omit to get `hr`
   * for horizontal and `div` for vertical.
   */
  as?: GhostSeparatorElement
  /**
   * When true, the line is presentational (`role="none"`). Defaults false so
   * native `hr` and menu/toolbar grouping keep separator semantics.
   * @default false
   */
  decorative?: boolean
  /**
   * Axis of the line. Vertical has no native element, so the default `as` is `div`.
   * @default 'horizontal'
   */
  orientation?: GhostSeparatorOrientation
}

/** Options for {@link useGhostSeparator}. */
export interface UseGhostSeparatorOptions {
  as?: MaybeRefOrGetter<GhostSeparatorElement | undefined>
  decorative?: MaybeRefOrGetter<boolean | undefined>
  orientation?: MaybeRefOrGetter<GhostSeparatorOrientation | undefined>
}
