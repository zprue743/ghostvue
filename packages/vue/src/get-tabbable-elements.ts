/**
 * Small local tabbable query. Dialog, menus, and composites need this without
 * taking on `tabbable` / `focus-trap` as a runtime dependency.
 *
 * Visibility uses computed style and hiding attributes rather than layout
 * metrics: jsdom reports 0×0 for every element, so offsetWidth would empty
 * the sequence in unit tests and still be wrong for zero-size controls.
 *
 * Scope boundary: queries light-DOM candidates under `root` (or the direct tree
 * of `root` when `root` itself is a `ShadowRoot`). Does not traverse into nested
 * open shadow roots or closed shadow roots.
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
  const hiddenCache = new Map<HTMLElement, boolean>()
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  const tabbable: HTMLElement[] = []
  const rest: HTMLElement[] = []

  for (const element of collectCandidates(root)) {
    if (!isElementTabbable(element, hiddenCache, styleCache)) {
      continue
    }
    if (element.tabIndex > 0) {
      tabbable.push(element)
    } else {
      rest.push(element)
    }
  }

  tabbable.sort((left, right) => left.tabIndex - right.tabIndex)
  return filterRadioGroups(
    [...tabbable, ...rest],
    root,
    hiddenCache,
    styleCache,
  )
}

/** Focusable includes tabindex="-1", which roving items use as the resting stop. */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
  const hiddenCache = new Map<HTMLElement, boolean>()
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  return collectCandidates(root).filter((element) =>
    isElementFocusable(element, hiddenCache, styleCache),
  )
}

export function isFocusable(element: HTMLElement): boolean {
  return isElementFocusable(element)
}

export function isSameRadioGroup(a: Element, b: Element): boolean {
  if (!isNamedNativeRadio(a) || !isNamedNativeRadio(b) || a.name !== b.name) {
    return false
  }
  return getRadioGroupScope(a) === getRadioGroupScope(b)
}

function isElementFocusable(
  element: HTMLElement,
  hiddenCache?: Map<HTMLElement, boolean>,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (
    isNativelyDisabledElement(element) ||
    isHidden(element, hiddenCache, styleCache)
  ) {
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

function isElementTabbable(
  element: HTMLElement,
  hiddenCache?: Map<HTMLElement, boolean>,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (!isElementFocusable(element, hiddenCache, styleCache)) {
    return false
  }
  // jsdom reports tabIndex -1 and omits isContentEditable; browsers still tab here.
  return element.tabIndex >= 0 || isContentEditableHost(element)
}

function isNamedNativeRadio(element: Element): element is HTMLInputElement {
  return (
    element instanceof HTMLInputElement &&
    element.type === 'radio' &&
    element.name !== ''
  )
}

function getRadioGroupScope(radio: HTMLInputElement): Node {
  return radio.form ?? radio.getRootNode()
}

function filterRadioGroups(
  ordered: HTMLElement[],
  root: ParentNode,
  hiddenCache: Map<HTMLElement, boolean>,
  styleCache: Map<HTMLElement, CSSStyleDeclaration>,
): HTMLElement[] {
  const groups = new Map<Node, Map<string, HTMLInputElement[]>>()

  for (const element of ordered) {
    if (!isNamedNativeRadio(element)) {
      continue
    }
    const scope = getRadioGroupScope(element)
    let byName = groups.get(scope)
    if (!byName) {
      byName = new Map<string, HTMLInputElement[]>()
      groups.set(scope, byName)
    }
    let list = byName.get(element.name)
    if (!list) {
      list = []
      byName.set(element.name, list)
    }
    list.push(element)
  }

  if (groups.size === 0) {
    return ordered
  }

  const activeStopByGroup = new Map<
    Node,
    Map<string, HTMLInputElement | null>
  >()

  for (const [scope, byName] of groups) {
    const selectedByName = new Map<string, HTMLInputElement | null>()
    activeStopByGroup.set(scope, selectedByName)
    for (const [name, radios] of byName) {
      const checked = radios.find((radio) => radio.checked)
      if (checked) {
        selectedByName.set(name, checked)
      } else if (
        hasExternalCheckedTabbableRadio(
          scope,
          name,
          radios[0]?.form ?? null,
          root,
          hiddenCache,
          styleCache,
        )
      ) {
        selectedByName.set(name, null)
      } else {
        selectedByName.set(name, radios[0] ?? null)
      }
    }
  }

  return ordered.filter((element) => {
    if (!isNamedNativeRadio(element)) {
      return true
    }
    const scope = getRadioGroupScope(element)
    return activeStopByGroup.get(scope)?.get(element.name) === element
  })
}

function hasExternalCheckedTabbableRadio(
  scope: Node,
  name: string,
  form: HTMLFormElement | null,
  root: ParentNode,
  hiddenCache: Map<HTMLElement, boolean>,
  styleCache: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (scope === root) {
    return false
  }
  const isInsideRoot = (el: Element): boolean =>
    root instanceof Node && root.contains(el)

  if (scope instanceof HTMLFormElement) {
    for (const control of scope.elements) {
      if (
        control instanceof HTMLInputElement &&
        control.type === 'radio' &&
        control.checked &&
        control.name === name &&
        !isInsideRoot(control) &&
        isElementTabbable(control, hiddenCache, styleCache)
      ) {
        return true
      }
    }
    return false
  }

  if (scope instanceof Document || scope instanceof ShadowRoot) {
    const checkedRadios = scope.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]:checked',
    )
    for (const radio of checkedRadios) {
      if (
        radio.name === name &&
        radio.form === form &&
        !isInsideRoot(radio) &&
        isElementTabbable(radio, hiddenCache, styleCache)
      ) {
        return true
      }
    }
  }

  return false
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

function readComputedStyle(
  element: HTMLElement,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): CSSStyleDeclaration {
  const cached = styleCache?.get(element)
  if (cached) {
    return cached
  }
  const style = getComputedStyle(element)
  styleCache?.set(element, style)
  return style
}

function isSubtreeHidden(
  element: HTMLElement,
  hiddenCache?: Map<HTMLElement, boolean>,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  const chain: HTMLElement[] = []
  let result = false

  // Ancestor `display:none` (e.g. closed `v-show`) and hiding attributes hide
  // descendants even when their own computed display is still `inline-block`.
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const cached = hiddenCache?.get(node)
    if (cached !== undefined) {
      result = cached
      break
    }
    chain.push(node)
    if (
      node.hasAttribute('hidden') ||
      node.hasAttribute('inert') ||
      node.getAttribute('aria-hidden') === 'true' ||
      readComputedStyle(node, styleCache).display === 'none'
    ) {
      result = true
      break
    }
  }

  if (hiddenCache) {
    for (const node of chain) {
      hiddenCache.set(node, result)
    }
  }
  return result
}

function isHidden(
  element: HTMLElement,
  hiddenCache?: Map<HTMLElement, boolean>,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (isSubtreeHidden(element, hiddenCache, styleCache)) {
    return true
  }

  const own = readComputedStyle(element, styleCache)
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
