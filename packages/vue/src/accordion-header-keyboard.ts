/** Direct-child accordion headers only; excludes triggers inside nested accordions. */
export const DIRECT_ACCORDION_TRIGGER_SELECTOR =
  ':scope > [data-part="item"] > [data-part="header"] > [data-part="trigger"]'

export function getDirectAccordionTriggers(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll(DIRECT_ACCORDION_TRIGGER_SELECTOR),
  ).filter((node): node is HTMLElement => node instanceof HTMLElement)
}

export function isDirectAccordionTrigger(
  root: HTMLElement,
  target: EventTarget | null,
): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.getAttribute('data-part') !== 'trigger') {
    return false
  }
  const header = target.closest('[data-part="header"]')
  if (
    !header ||
    !(header instanceof HTMLElement) ||
    header.getAttribute('data-part') !== 'header'
  ) {
    return false
  }
  const item = header.parentElement
  if (
    item?.getAttribute('data-part') !== 'item' ||
    item.parentElement !== root
  ) {
    return false
  }
  return true
}

function isNativeDisabled(trigger: HTMLElement): boolean {
  return trigger instanceof HTMLButtonElement && trigger.disabled
}

/** Headers that participate in accordion arrow-key navigation (native disabled only). */
export function isAccordionHeaderNavigable(trigger: HTMLElement): boolean {
  return !isNativeDisabled(trigger)
}

export function focusFirstEnabledAccordionTrigger(
  root: HTMLElement,
  options?: FocusOptions,
): boolean {
  const first = getDirectAccordionTriggers(root).find(
    isAccordionHeaderNavigable,
  )
  if (!first) {
    return false
  }
  first.focus(options)
  return true
}

/**
 * Optional APG header keys among direct triggers only; does not mutate tabindex.
 */
export function handleAccordionHeaderKeydown(
  event: KeyboardEvent,
  root: HTMLElement,
): void {
  if (!isDirectAccordionTrigger(root, event.target)) {
    return
  }

  const key = event.key
  if (
    key !== 'ArrowDown' &&
    key !== 'ArrowUp' &&
    key !== 'Home' &&
    key !== 'End'
  ) {
    return
  }

  const triggers = getDirectAccordionTriggers(root).filter(
    isAccordionHeaderNavigable,
  )
  if (triggers.length === 0) {
    return
  }

  const active = event.target
  let index = triggers.indexOf(active)
  if (index === -1) {
    return
  }

  event.preventDefault()

  if (key === 'Home') {
    triggers[0]?.focus()
    return
  }
  if (key === 'End') {
    triggers[triggers.length - 1]?.focus()
    return
  }

  if (key === 'ArrowDown') {
    index = (index + 1) % triggers.length
  } else {
    index = (index - 1 + triggers.length) % triggers.length
  }
  triggers[index]?.focus()
}
