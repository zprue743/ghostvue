import { invokeAttrHandler } from './invoke-attr-handler'
import { isImeComposing } from './is-ime-composing'

/**
 * Internal helpers for the item parts that DropdownMenu, ContextMenu and
 * Menubar implement identically (`*Item`, `*CheckboxItem`, `*RadioItem`).
 *
 * Only the steps that are byte-for-byte the same in every family live here.
 * What happens after the consumer listener runs (emit `select`, toggle the
 * checkbox, select the radio value, close the menu) stays explicit in each
 * part because the ordering differs per item kind: ordinary and radio items
 * emit before checking cancellation, a radio item commits its value even when
 * the click is cancelled, and a checkbox item only toggles when it is not.
 * Not exported from the package entry.
 */

/**
 * Returns the consumer attrs without the listener the part handles itself, so
 * `v-bind` does not attach a second, unguarded copy of the consumer `onClick`.
 * `class`, `style` and every other attribute pass through untouched for Vue to
 * merge with the part's own bindings.
 */
export function omitMenuItemClickAttr(
  attrs: Record<string, unknown>,
): Record<string, unknown> {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'onClick') {
      rest[key] = value
    }
  }
  return rest
}

/**
 * Runs the shared, disabled-first prefix of a menu item click and reports
 * whether the part may continue with its own activation.
 *
 * A disabled item cancels the click and never reaches consumer listeners, so a
 * disabled item cannot run consumer side effects (GHO-161). An enabled item
 * runs the consumer `onClick` (function or array) before any library behavior,
 * so a consumer `preventDefault()` is observable by the caller via
 * `event.defaultPrevented`.
 */
export function runMenuItemConsumerClick(
  event: MouseEvent,
  disabled: boolean,
  attrs: Record<string, unknown>,
): boolean {
  if (disabled) {
    event.preventDefault()
    return false
  }
  invokeAttrHandler(attrs['onClick'], event)
  return true
}

/**
 * Keyboard activation shared by every menu checkbox item: Enter and Space are
 * routed through a synthetic `click()` so the consumer `onClick`, its
 * cancellation and the toggle follow exactly the pointer path (GHO-140).
 *
 * Already-cancelled events, disabled items and IME-owned keys are ignored; an
 * IME Enter/Space confirms a composition, not the item.
 */
export function handleMenuCheckboxItemKeydown(
  event: KeyboardEvent,
  disabled: boolean,
  element: HTMLElement | null,
): void {
  if (disabled || event.defaultPrevented || isImeComposing(event)) {
    return
  }
  if (event.key !== ' ' && event.key !== 'Enter') {
    return
  }
  event.preventDefault()
  element?.click()
}
