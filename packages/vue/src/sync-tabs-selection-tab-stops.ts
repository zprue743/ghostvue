import { isDisabledElement } from './get-tabbable-elements'

/**
 * Applies the tabs selection tab stop: the active enabled tab (or fallback)
 * receives `tabindex="0"`; other enabled tabs receive `-1`. Called after
 * selection changes and when focus leaves the tab list so Tab into the
 * widget lands on the selected tab even after keyboard roving.
 */
export function applyTabsSelectionTabStops(
  listRoot: HTMLElement,
  tabStopValue: string | undefined,
): void {
  const tabs = Array.from(
    listRoot.querySelectorAll<HTMLElement>('[role="tab"]'),
  )
  const enabled = tabs.filter((tab) => !isDisabledElement(tab))
  const stop =
    (tabStopValue
      ? enabled.find((tab) => tab.dataset['ghostTabsValue'] === tabStopValue)
      : undefined) ?? enabled[0]

  for (const tab of tabs) {
    if (isDisabledElement(tab)) {
      tab.tabIndex = -1
      continue
    }
    tab.tabIndex = tab === stop ? 0 : -1
  }
}
