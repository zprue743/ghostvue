import { segmentedControlTabStopSelectors } from './sync-toggle-group-selection-tab-stops'

/**
 * Reads segment item values in DOM order within one group root (same scope as
 * tab-stop sync). Browser-only.
 */
export function getSegmentedControlItemOrderFromDom(
  groupRoot: HTMLElement,
): string[] {
  const { itemClass, rootClass, valueDatasetKey } =
    segmentedControlTabStopSelectors
  const items = Array.from(
    groupRoot.querySelectorAll<HTMLElement>(`.${itemClass}`),
  ).filter((item) => item.closest(`.${rootClass}`) === groupRoot)

  return items
    .map((item) => item.dataset[valueDatasetKey])
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
}
