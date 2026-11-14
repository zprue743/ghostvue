import type { MaybeRefOrGetter } from 'vue'

/** Root element for GhostEmptyState. */
export type GhostEmptyStateElement = 'div' | 'section'

/** Native heading level for the title slot. */
export type GhostEmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Declared props on the unstyled GhostEmptyState SFC. */
export interface GhostEmptyStateProps {
  /** Root element. Prefer `div` inside table cells. */
  as?: GhostEmptyStateElement
  /** Heading level wrapping the `title` slot. */
  headingLevel?: GhostEmptyStateHeadingLevel
}

/** Options for {@link useGhostEmptyState}. */
export interface UseGhostEmptyStateOptions {
  as?: MaybeRefOrGetter<GhostEmptyStateElement | undefined>
  headingLevel?: MaybeRefOrGetter<GhostEmptyStateHeadingLevel | undefined>
  /** Whether the title slot is rendered. */
  hasTitle?: MaybeRefOrGetter<boolean>
  /** Generated or overridden title id for aria-labelledby. */
  titleId?: MaybeRefOrGetter<string>
}

/** Template ref contract for GhostEmptyState. */
export interface GhostEmptyStateExposed {
  /** Root element after mount; null before mount. */
  readonly element: HTMLElement | null
}
