import type { MaybeRefOrGetter } from 'vue'

/** Root element for GhostInlineAlert. */
export type GhostInlineAlertElement = 'div' | 'section'

/** Native heading level for the title slot. */
export type GhostInlineAlertHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Live-region semantics for copy that appears or updates after mount. */
export type GhostInlineAlertAnnounce = 'off' | 'status' | 'alert'

/** Declared props on the unstyled GhostInlineAlert SFC. */
export interface GhostInlineAlertProps {
  /** Root element. Prefer `div` inside table cells. */
  as?: GhostInlineAlertElement
  /** Heading level wrapping the `title` slot. */
  headingLevel?: GhostInlineAlertHeadingLevel
  /**
   * Live-region behavior. Default `off` for static inline feedback.
   * Use `status` or `alert` only when copy appears or changes after mount.
   */
  announce?: GhostInlineAlertAnnounce
}

/** Options for {@link useGhostInlineAlert}. */
export interface UseGhostInlineAlertOptions {
  as?: MaybeRefOrGetter<GhostInlineAlertElement | undefined>
  headingLevel?: MaybeRefOrGetter<GhostInlineAlertHeadingLevel | undefined>
  announce?: MaybeRefOrGetter<GhostInlineAlertAnnounce | undefined>
  /** Whether the title slot is rendered. */
  hasTitle?: MaybeRefOrGetter<boolean>
  /** Generated or overridden title id for aria-labelledby. */
  titleId?: MaybeRefOrGetter<string>
}

/** Template ref contract for GhostInlineAlert. */
export interface GhostInlineAlertExposed {
  /** Root element after mount; null before mount. */
  readonly element: HTMLElement | null
}
