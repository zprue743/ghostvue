/**
 * Closed union: interactive/void tags would become tab stops inside an
 * `aria-hidden` tree or cannot hold a box. Widening is additive; narrowing
 * is breaking.
 */
export type GhostSkeletonElement = 'span' | 'div' | 'p' | 'li' | 'td' | 'th'

/** Props for the unstyled {@link GhostSkeleton} component. */
export interface GhostSkeletonProps {
  /**
   * Root tag valid in the parent context (`td` in a row, `li` in a list).
   * @default 'span'
   */
  as?: GhostSkeletonElement
}
