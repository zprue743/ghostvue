import type { MaybeRefOrGetter } from 'vue'

/** Host for the scrollable root. Closed union; widening is additive. */
export type GhostScrollAreaElement = 'div'

/** Axes that may scroll when content exceeds the box. */
export type GhostScrollAreaOrientation = 'vertical' | 'horizontal' | 'both'

/** Native overflow mode on enabled axes. */
export type GhostScrollAreaOverflowType = 'auto' | 'scroll'

/** Runtime overflow measured on the root. */
export type GhostScrollAreaOverflowState =
  'none' | 'vertical' | 'horizontal' | 'both'

/** Props for the unstyled {@link GhostScrollArea} component. */
export interface GhostScrollAreaProps {
  /**
   * When the root is a tab stop with no inner focusables, sets `role="region"`
   * and `aria-label`. Provide this whenever overflowed static content has no
   * tab stops inside.
   */
  label?: string
  /**
   * Which axes may scroll.
   * @default 'vertical'
   */
  orientation?: GhostScrollAreaOrientation
  /**
   * Root host element.
   * @default 'div'
   */
  as?: GhostScrollAreaElement
  /**
   * `auto` shows scrollbars when needed; `scroll` keeps scrollable overflow on
   * enabled axes.
   * @default 'auto'
   */
  type?: GhostScrollAreaOverflowType
}

/** Options for {@link useGhostScrollArea}. */
export interface UseGhostScrollAreaOptions {
  as?: MaybeRefOrGetter<GhostScrollAreaElement | undefined>
  label?: MaybeRefOrGetter<string | undefined>
  orientation?: MaybeRefOrGetter<GhostScrollAreaOrientation | undefined>
  type?: MaybeRefOrGetter<GhostScrollAreaOverflowType | undefined>
}

/** Exposed handle for {@link GhostScrollArea}. */
export interface GhostScrollAreaExposed {
  /** Scrollable root element. */
  get element(): HTMLElement | undefined
}
