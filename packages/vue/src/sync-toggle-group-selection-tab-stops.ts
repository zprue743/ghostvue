import { isDisabledElement, isFocusable } from './get-tabbable-elements'

export interface ToggleGroupTabStopSelectors {
  itemClass: string
  rootClass: string
  valueDatasetKey: string
}

const defaultToggleGroupTabStopSelectors: ToggleGroupTabStopSelectors = {
  itemClass: 'ghost-toggle-group-item',
  rootClass: 'ghost-toggle-group',
  valueDatasetKey: 'ghostToggleGroupValue',
}

const segmentedControlTabStopSelectors: ToggleGroupTabStopSelectors = {
  itemClass: 'ghost-segmented-control-item',
  rootClass: 'ghost-segmented-control',
  valueDatasetKey: 'ghostSegmentedControlValue',
}

/**
 * Applies the toggle-group primary tab stop: the first pressed enabled item in
 * registration order (or the explicit `tabStopValue` match), else the first
 * enabled item, receives `tabindex="0"`. Other enabled items use `-1`.
 */
export function applyToggleGroupSelectionTabStops(
  groupRoot: HTMLElement,
  tabStopValue: string | undefined,
  selectors: ToggleGroupTabStopSelectors = defaultToggleGroupTabStopSelectors,
): HTMLElement | undefined {
  const items = Array.from(
    groupRoot.querySelectorAll<HTMLElement>(`.${selectors.itemClass}`),
  ).filter((item) => item.closest(`.${selectors.rootClass}`) === groupRoot)
  const enabled = items.filter((item) => !isDisabledElement(item))
  const enabledVisible = enabled.filter((item) => isFocusable(item))

  const stopForValue = (pool: HTMLElement[], value: string | undefined) =>
    value
      ? pool.find((item) => item.dataset[selectors.valueDatasetKey] === value)
      : undefined

  const stop =
    stopForValue(enabledVisible, tabStopValue) ??
    enabledVisible[0] ??
    stopForValue(enabled, tabStopValue) ??
    enabled[0]

  for (const item of items) {
    if (isDisabledElement(item)) {
      item.tabIndex = -1
      continue
    }
    item.tabIndex = item === stop ? 0 : -1
  }

  return stop
}

/** Segmented control tab stops; same roving contract as toggle groups. */
export function applySegmentedControlSelectionTabStops(
  groupRoot: HTMLElement,
  tabStopValue: string | undefined,
): HTMLElement | undefined {
  return applyToggleGroupSelectionTabStops(
    groupRoot,
    tabStopValue,
    segmentedControlTabStopSelectors,
  )
}
