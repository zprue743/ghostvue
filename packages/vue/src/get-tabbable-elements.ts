/**
 * Small local tabbable query. Dialog, menus, and composites need this without
 * taking on `tabbable` / `focus-trap` as a runtime dependency.
 *
 * Visibility uses computed style and hiding attributes rather than layout
 * metrics: jsdom reports 0×0 for every element, so offsetWidth would empty
 * the sequence in unit tests and still be wrong for zero-size controls.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

export function getTabbableElements(root: ParentNode): HTMLElement[] {
  const tabbable: HTMLElement[] = []
  const rest: HTMLElement[] = []

  for (const element of collectCandidates(root)) {
    if (!isTabbable(element)) {
      continue
    }
    if (element.tabIndex > 0) {
      tabbable.push(element)
    } else {
      rest.push(element)
    }
  }

  tabbable.sort((left, right) => left.tabIndex - right.tabIndex)
  return [...tabbable, ...rest]
}

/** Focusable includes tabindex="-1", which roving items use as the resting stop. */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
  return collectCandidates(root).filter((element) => isFocusable(element))
}

export function isFocusable(element: HTMLElement): boolean {
  if (isNativelyDisabledElement(element) || isHidden(element)) {
    return false
  }
  if (element.matches(FOCUSABLE_SELECTOR)) {
    return true
  }
  return element.tabIndex >= 0
}

/** Native disabled state and fieldsets — excludes items from tab/focus queries. */
function isNativelyDisabledElement(element: HTMLElement): boolean {
  if (hasDisabledProperty(element) && element.disabled) {
    return true
  }
  return Boolean(element.closest('fieldset[disabled]'))
}

/**
 * Composite navigation policy: roving widgets skip these items but loading
 * controls may keep `aria-disabled` while remaining natively focusable.
 */
export function isDisabledElement(element: HTMLElement): boolean {
  if (isNativelyDisabledElement(element)) {
    return true
  }
  if (element.getAttribute('aria-disabled') === 'true') {
    return true
  }
  return false
}

function isTabbable(element: HTMLElement): boolean {
  if (!isFocusable(element)) {
    return false
  }
  // jsdom reports tabIndex -1 and omits isContentEditable; browsers still tab here.
  return element.tabIndex >= 0 || isContentEditableHost(element)
}

function isContentEditableHost(element: HTMLElement): boolean {
  const value = element.getAttribute('contenteditable')
  if (value === null || value === 'false') {
    return element.isContentEditable
  }
  return true
}

function collectCandidates(root: ParentNode): HTMLElement[] {
  const descendants = [
    ...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ]
  if (root instanceof HTMLElement) {
    return [root, ...descendants]
  }
  return descendants
}

function isHidden(element: HTMLElement): boolean {
  if (
    element.closest('[hidden]') ||
    element.closest('[inert]') ||
    element.closest('[aria-hidden="true"]')
  ) {
    return true
  }

  // Ancestor `display:none` (e.g. closed `v-show`) hides descendants even when
  // their own computed display is still `inline-block`.
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).display === 'none') {
      return true
    }
  }

  const own = getComputedStyle(element)
  return own.visibility === 'hidden' || own.visibility === 'collapse'
}

function hasDisabledProperty(
  element: HTMLElement,
): element is HTMLElement & { disabled: boolean } {
  return (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLFieldSetElement ||
    element instanceof HTMLOptionElement ||
    element instanceof HTMLOptGroupElement
  )
}
