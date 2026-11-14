import type { HTMLAttributes } from 'vue'

/**
 * Unstyled {@link GhostBadge} props. Native span attributes fall through; there
 * are no behavioral props because a badge is presentational.
 */
export type GhostBadgeProps = HTMLAttributes

/** Methods and state available from a template ref to {@link GhostBadge}. */
export interface GhostBadgeExposed {
  /** The native span after mount, or `null` before mount and after unmount. */
  readonly element: HTMLSpanElement | null
}
