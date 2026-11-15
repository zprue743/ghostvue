import type { MaybeRefOrGetter } from 'vue'

import type { InteractiveEffect } from './ghost-interactive-surface'

/**
 * Closed union: widening later is additive; narrowing is breaking. Interactive
 * hosts must not nest other interactive descendants in header, content, or footer.
 */
export type GhostCardElement =
  'div' | 'article' | 'section' | 'aside' | 'a' | 'button'

/** Declared props on the unstyled GhostCard SFC. */
export interface GhostCardProps {
  /**
   * Root element. Default `article` for self-contained summaries.
   * @default 'article'
   */
  as?: GhostCardElement
  /**
   * Ambient spotlight recipes. Empty list keeps the card inert.
   * @default []
   */
  effects?: InteractiveEffect[]
}

/** Options for {@link useGhostCard}. */
export interface UseGhostCardOptions {
  as?: MaybeRefOrGetter<GhostCardElement | undefined>
}

/** Template ref contract for GhostCard. */
export interface GhostCardExposed {
  /** Root element after mount; null before mount. */
  readonly element: HTMLElement | null
}
