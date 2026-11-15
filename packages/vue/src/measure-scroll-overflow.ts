import type {
  GhostScrollAreaOrientation,
  GhostScrollAreaOverflowState,
} from './ghost-scroll-area'

/**
 * Compares scroll and client metrics for the axes allowed by `orientation`.
 * Callers stub layout in unit tests when jsdom reports zero sizes.
 */
export function measureScrollOverflow(
  element: HTMLElement,
  orientation: GhostScrollAreaOrientation,
): GhostScrollAreaOverflowState {
  const verticalOverflow =
    (orientation === 'vertical' || orientation === 'both') &&
    element.scrollHeight > element.clientHeight
  const horizontalOverflow =
    (orientation === 'horizontal' || orientation === 'both') &&
    element.scrollWidth > element.clientWidth

  if (verticalOverflow && horizontalOverflow) {
    return 'both'
  }
  if (verticalOverflow) {
    return 'vertical'
  }
  if (horizontalOverflow) {
    return 'horizontal'
  }
  return 'none'
}
