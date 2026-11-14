import { isDisabledElement, isFocusable } from './get-tabbable-elements'

/**
 * Applies the toggle-group primary tab stop: the first pressed enabled item in
 * registration order (or the explicit `tabStopValue` match), else the first
 * enabled item, receives `tabindex="0"`. Other enabled items use `-1`.
 */
export function applyToggleGroupSelectionTabStops(
  groupRoot: HTMLElement,
  tabStopValue: string | undefined,
): void {
  const items = Array.from(
    groupRoot.querySelectorAll<HTMLElement>('.ghost-toggle-group-item'),
  ).filter((item) => item.closest('.ghost-toggle-group') === groupRoot)
  const enabled = items.filter((item) => !isDisabledElement(item))
  const enabledVisible = enabled.filter((item) => isFocusable(item))

  const stopForValue = (pool: HTMLElement[], value: string | undefined) =>
    value
      ? pool.find((item) => item.dataset['ghostToggleGroupValue'] === value)
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
}
