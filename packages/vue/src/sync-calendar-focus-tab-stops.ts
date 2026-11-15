const CELL_SELECTOR = '[data-ghost-calendar-date]'

/** Apply roving tabindex on the focused calendar cell button. */
export function applyCalendarFocusTabStops(
  gridRoot: HTMLElement,
  focusedDateKey: string,
): void {
  const cells = gridRoot.querySelectorAll<HTMLElement>(CELL_SELECTOR)
  for (const cell of cells) {
    const dateKey = cell.getAttribute('data-ghost-calendar-date')
    const control = cell.matches(
      'button, [href], input, select, textarea, [tabindex]',
    )
      ? cell
      : cell.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]',
        )
    if (!control) {
      continue
    }
    control.tabIndex = dateKey === focusedDateKey ? 0 : -1
  }
}
