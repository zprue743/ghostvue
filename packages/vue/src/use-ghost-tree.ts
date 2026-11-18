import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import {
  resolveTreeDir,
  type GhostTreeDirection,
  type GhostTreeNodeRecord,
  type GhostTreeValue,
  type UseGhostTreeOptions,
  type UseGhostTreeReturn,
} from './ghost-tree'
import { isImeComposing } from './is-ime-composing'
import { sortByDocumentOrder } from './sort-by-document-order'
import { findTypeaheadMatch } from './typeahead-match'
import { useControllableState } from './use-controllable-state'

/** APG typeahead window; matches Select and menu collections. */
const TYPEAHEAD_MS = 500

const HIDDEN_ANCESTOR_SELECTOR = '[hidden],[inert],[aria-hidden="true"]'

/**
 * Headless APG Tree View state: controlled/uncontrolled selection and
 * expansion, a `Map` registry of mounted items, a single roving tab stop over
 * visible enabled items, hierarchical keyboard navigation, typeahead, and
 * focus recovery.
 *
 * Focus, selection, and expansion are independent: navigation only moves
 * `focusedValue`, and selection/expansion only change through `select`,
 * `setExpanded`, and `expandAllSiblings`. DOM listeners belong to the caller
 * (`GhostTree` attaches `handleKeydown` / `handleFocusIn` after mount), so
 * setup never touches `window` or `document` and stays SSR-safe.
 */
export function useGhostTree(
  options: UseGhostTreeOptions = {},
): UseGhostTreeReturn {
  const selectionMode = computed(
    () => toValue(options.selectionMode) ?? 'single',
  )
  const disabled = computed(() => toValue(options.disabled) === true)

  // `allowControlledUndefined` lets a `v-model` parent clear single selection
  // (`undefined`) without dropping back to stale uncontrolled state.
  const selection = useControllableState<GhostTreeValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      options.onValueChange?.(next)
    },
    allowControlledUndefined: true,
  })

  const expandedState = useControllableState<string[]>({
    prop: () => toValue(options.expanded),
    // Copy so internal writes never alias the consumer's default array.
    defaultValue: () => [...(toValue(options.defaultExpanded) ?? [])],
    onChange: (next) => {
      options.onExpandedChange?.(next)
    },
  })

  const modelValue = computed<GhostTreeValue>(() => selection.value)
  const expanded = computed<string[]>(() => expandedState.value)
  const expandedSet = computed(() => new Set(expanded.value))

  /** Selected values normalized to the active mode (never mutated). */
  const selectedValues = computed<readonly string[]>(() => {
    const value = selection.value
    if (selectionMode.value === 'multiple') {
      if (Array.isArray(value)) {
        return value
      }
      return typeof value === 'string' ? [value] : []
    }
    if (typeof value === 'string') {
      return [value]
    }
    return []
  })
  const selectedSet = computed(() => new Set(selectedValues.value))

  // Registry: a plain Map plus a version counter so registering N items is
  // O(N) without cloning reactive arrays on every mount. Computeds that read
  // the registry depend on `registryVersion`.
  const nodes = new Map<string, GhostTreeNodeRecord>()
  const registryVersion = shallowRef(0)

  const focusedValue = shallowRef<string | undefined>(undefined)
  const mounted = shallowRef(false)
  const inheritedDir = shallowRef<GhostTreeDirection>('ltr')

  onMounted(() => {
    mounted.value = true
    inheritedDir.value = resolveTreeDir(
      undefined,
      toValue(options.rootElement) ?? null,
    )
  })

  const dir = computed<GhostTreeDirection>(() => {
    const explicit = toValue(options.dir)
    if (explicit === 'ltr' || explicit === 'rtl') {
      return explicit
    }
    return mounted.value ? inheritedDir.value : 'ltr'
  })

  function isSelected(value: string): boolean {
    return selectedSet.value.has(value)
  }

  function isExpanded(value: string): boolean {
    return expandedSet.value.has(value)
  }

  function isDisabled(value: string): boolean {
    if (disabled.value) {
      return true
    }
    return nodes.get(value)?.isDisabled() === true
  }

  function isDescendantOf(value: string, ancestor: string): boolean {
    let parent = nodes.get(value)?.parentValue
    while (parent !== undefined) {
      if (parent === ancestor) {
        return true
      }
      parent = nodes.get(parent)?.parentValue
    }
    return false
  }

  /**
   * Logical visibility: every ancestor item is expanded. Used for tab stops
   * (deterministic during SSR) and so descendants leave navigation the moment
   * a branch collapses, even while a themed close transition still shows them.
   */
  function isLogicallyVisible(value: string): boolean {
    let parent = nodes.get(value)?.parentValue
    while (parent !== undefined) {
      if (!isExpanded(parent)) {
        return false
      }
      parent = nodes.get(parent)?.parentValue
    }
    return true
  }

  function isEligible(value: string): boolean {
    return nodes.has(value) && !isDisabled(value) && isLogicallyVisible(value)
  }

  function isDomVisible(record: GhostTreeNodeRecord): boolean {
    const element = record.getElement()
    if (!element?.isConnected) {
      return false
    }
    if (element.closest(HIDDEN_ANCESTOR_SELECTOR)) {
      return false
    }
    // `checkVisibility` covers `display: none` ancestors in browsers; jsdom
    // lacks it, where the attribute check above is the whole contract.
    if (typeof element.checkVisibility === 'function') {
      return element.checkVisibility()
    }
    return true
  }

  /** Visible enabled values in rendered document order (navigation only). */
  function getNavigableValues(): string[] {
    const records = [...nodes.values()].filter(
      (record) => isEligible(record.value) && isDomVisible(record),
    )
    return sortByDocumentOrder(records, (record) => record.getElement()).map(
      (record) => record.value,
    )
  }

  /**
   * Initial and fallback roving tab stop. Uses registration order and logical
   * visibility only, so the server and the hydration render agree: setup (and
   * therefore registration) runs in document order in both.
   */
  const tabStopValue = computed<string | undefined>(() => {
    void registryVersion.value
    const focused = focusedValue.value
    if (focused !== undefined && isEligible(focused)) {
      return focused
    }
    const eligible = [...nodes.keys()].filter((value) => isEligible(value))
    const selected = selectedValues.value
    if (selected.length > 0) {
      const match = eligible.find((value) => selectedSet.value.has(value))
      if (match !== undefined) {
        return match
      }
      // Before mount a selected item may simply not have rendered yet (items
      // render one by one during SSR). Withhold the stop rather than giving it
      // to an earlier item that the selected one would later contradict.
      if (!mounted.value && selected.some((value) => !nodes.has(value))) {
        return undefined
      }
    }
    return eligible[0]
  })

  function getElement(value: string | undefined): HTMLElement | null {
    if (value === undefined) {
      return null
    }
    return nodes.get(value)?.getElement() ?? null
  }

  function focusNode(value: string, focusOptions?: FocusOptions): boolean {
    if (!isEligible(value)) {
      return false
    }
    focusedValue.value = value
    getElement(value)?.focus(focusOptions)
    return true
  }

  function select(value: string): void {
    if (isDisabled(value)) {
      return
    }
    if (selectionMode.value === 'multiple') {
      const current = selectedValues.value
      const wasSelected = current.includes(value)
      // New arrays only: the consumer's `modelValue` is never mutated.
      selection.value = wasSelected
        ? current.filter((entry) => entry !== value)
        : [...current, value]
      options.onSelect?.({ value, selected: !wasSelected })
      return
    }
    if (isSelected(value)) {
      if (toValue(options.allowDeselect) !== true) {
        return
      }
      selection.value = undefined
      options.onSelect?.({ value, selected: false })
      return
    }
    selection.value = value
    options.onSelect?.({ value, selected: true })
  }

  function setExpanded(value: string, open: boolean): void {
    if (isDisabled(value) || isExpanded(value) === open) {
      return
    }
    const current = expanded.value
    expandedState.value = open
      ? [...current, value]
      : current.filter((entry) => entry !== value)
    options.onToggle?.({ value, expanded: open })
  }

  function toggleExpanded(value: string): void {
    setExpanded(value, !isExpanded(value))
  }

  /** APG `*`: expand every closed enabled sibling branch in one update. */
  function expandAllSiblings(value: string): void {
    const record = nodes.get(value)
    if (!record || disabled.value) {
      return
    }
    const siblings = sortByDocumentOrder(
      [...nodes.values()].filter(
        (candidate) =>
          candidate.parentValue === record.parentValue &&
          candidate.isExpandable() &&
          !isDisabled(candidate.value) &&
          !isExpanded(candidate.value),
      ),
      (candidate) => candidate.getElement(),
    ).map((candidate) => candidate.value)
    if (siblings.length === 0) {
      return
    }
    expandedState.value = [...expanded.value, ...siblings]
    for (const sibling of siblings) {
      options.onToggle?.({ value: sibling, expanded: true })
    }
  }

  function closestEligibleAncestor(value: string): string | undefined {
    let parent = nodes.get(value)?.parentValue
    while (parent !== undefined) {
      if (isEligible(parent)) {
        return parent
      }
      parent = nodes.get(parent)?.parentValue
    }
    return undefined
  }

  /** Nearest navigable values after / before `reference` in document order. */
  function neighborsOf(
    reference: HTMLElement | null,
    candidates: readonly string[],
  ): { next: string | undefined; previous: string | undefined } {
    if (!reference?.isConnected) {
      return { next: undefined, previous: undefined }
    }
    let next: string | undefined
    let previous: string | undefined
    for (const value of candidates) {
      const element = getElement(value)
      if (!element || element === reference) {
        continue
      }
      const position = reference.compareDocumentPosition(element)
      if (position & Node.DOCUMENT_POSITION_CONTAINED_BY) {
        continue
      }
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        next ??= value
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        previous = value
      }
    }
    return { next, previous }
  }

  // DOM focus restoration is deferred to `nextTick` so a removed subtree has
  // left the document; one pending flag survives several unregistrations in
  // the same flush (a parent and its children unmount together).
  let restoreDomFocusPending = false

  function scheduleDomFocusRestore(): void {
    if (restoreDomFocusPending) {
      return
    }
    restoreDomFocusPending = true
    void nextTick(() => {
      restoreDomFocusPending = false
      const element = getElement(focusedValue.value)
      if (element?.isConnected) {
        element.focus({ preventScroll: true })
      }
    })
  }

  function holdsDomFocus(element: HTMLElement | null): boolean {
    if (!element || typeof document === 'undefined') {
      return false
    }
    const active = document.activeElement
    return active !== null && element.contains(active)
  }

  /**
   * An ancestor of the focused item collapsed: move the stop (and real focus,
   * if it was there) to the closest visible enabled ancestor, else the next,
   * else the previous visible enabled item. Runs before the DOM hides the
   * subtree, so focus never strands on a `hidden` node or falls to `<body>`.
   */
  function recoverFromCollapse(): void {
    const value = focusedValue.value
    if (value === undefined || !nodes.has(value) || isLogicallyVisible(value)) {
      return
    }
    const element = getElement(value)
    let target = closestEligibleAncestor(value)
    if (target === undefined) {
      const { next, previous } = neighborsOf(element, getNavigableValues())
      target = next ?? previous
    }
    const hadFocus = holdsDomFocus(element)
    focusedValue.value = target
    if (hadFocus && target !== undefined) {
      getElement(target)?.focus({ preventScroll: true })
    }
  }

  watch(expanded, recoverFromCollapse, { flush: 'pre' })

  /** The focused item (or an ancestor of it) is unmounting. */
  function recoverFromRemoval(record: GhostTreeNodeRecord): void {
    const removed = record.value
    const element = record.getElement()
    const remaining = getNavigableValues().filter(
      (value) => value !== removed && !isDescendantOf(value, removed),
    )
    const { next, previous } = neighborsOf(element, remaining)
    const target =
      next ?? previous ?? closestEligibleAncestor(removed) ?? remaining[0]
    // Unmounting never commits state: only the focus pointer moves.
    focusedValue.value = target
    if (holdsDomFocus(element) || restoreDomFocusPending) {
      scheduleDomFocusRestore()
    }
  }

  function registerNode(record: GhostTreeNodeRecord): () => void {
    nodes.set(record.value, record)
    registryVersion.value++
    return () => {
      if (nodes.get(record.value) !== record) {
        return
      }
      const focused = focusedValue.value
      if (
        focused !== undefined &&
        (focused === record.value || isDescendantOf(focused, record.value))
      ) {
        recoverFromRemoval(record)
      }
      nodes.delete(record.value)
      registryVersion.value++
    }
  }

  function itemValueFromTarget(target: EventTarget | null): string | undefined {
    if (typeof Element === 'undefined' || !(target instanceof Element)) {
      return undefined
    }
    const item = target.closest('[role="treeitem"]')
    const value = item?.getAttribute('data-ghost-tree-value')
    if (value === null || value === undefined) {
      return undefined
    }
    return nodes.get(value)?.getElement() === item ? value : undefined
  }

  function handleFocusIn(event: FocusEvent): void {
    const value = itemValueFromTarget(event.target)
    if (value !== undefined && isEligible(value)) {
      focusedValue.value = value
    }
  }

  let typeaheadQuery = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  function clearTypeahead(): void {
    typeaheadQuery = ''
    if (typeaheadTimer !== undefined) {
      clearTimeout(typeaheadTimer)
      typeaheadTimer = undefined
    }
  }

  onScopeDispose(clearTypeahead)

  function runTypeahead(current: string, key: string): boolean {
    typeaheadQuery += key
    if (typeaheadTimer !== undefined) {
      clearTimeout(typeaheadTimer)
    }
    typeaheadTimer = setTimeout(clearTypeahead, TYPEAHEAD_MS)
    const navigable = getNavigableValues()
    const match = findTypeaheadMatch(
      navigable,
      typeaheadQuery,
      navigable.includes(current) ? current : undefined,
      (value) => nodes.get(value)?.getTextValue() ?? '',
    )
    if (match === undefined) {
      return false
    }
    focusNode(match)
    return true
  }

  /** Next/previous navigable value relative to `current` (which may be disabled). */
  function stepFrom(
    current: string,
    navigable: readonly string[],
    delta: 1 | -1,
  ): string | undefined {
    const loop = toValue(options.loop) === true
    const index = navigable.indexOf(current)
    if (index >= 0) {
      const nextIndex = index + delta
      if (nextIndex >= 0 && nextIndex < navigable.length) {
        return navigable[nextIndex]
      }
      if (!loop || navigable.length < 2) {
        return undefined
      }
      return delta > 0 ? navigable[0] : navigable[navigable.length - 1]
    }
    const { next, previous } = neighborsOf(getElement(current), navigable)
    return delta > 0 ? next : previous
  }

  function handleKeydown(event: KeyboardEvent): void {
    // Modifier chords belong to the browser/OS/AT (GHO-168) and IME keys to
    // the input method (GHO-167): neither moves focus nor prevents default.
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isImeComposing(event) ||
      disabled.value ||
      isEditableTarget(event.target)
    ) {
      return
    }
    const current = itemValueFromTarget(event.target)
    if (current === undefined) {
      return
    }

    const resolvedDir = resolveTreeDir(
      toValue(options.dir),
      toValue(options.rootElement) ?? null,
    )
    const expandKey = resolvedDir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const collapseKey = resolvedDir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const record = nodes.get(current)
    const expandable = record?.isExpandable() === true
    const currentDisabled = isDisabled(current)

    const moveTo = (target: string | undefined): void => {
      if (target !== undefined && target !== current && focusNode(target)) {
        event.preventDefault()
      }
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        moveTo(
          stepFrom(
            current,
            getNavigableValues(),
            event.key === 'ArrowDown' ? 1 : -1,
          ),
        )
        return
      }
      case expandKey: {
        if (!expandable || currentDisabled) {
          return
        }
        if (!isExpanded(current)) {
          // Only propose expansion: a rejected controlled update must never
          // move focus into children that stay hidden.
          event.preventDefault()
          setExpanded(current, true)
          return
        }
        moveTo(
          getNavigableValues().find((value) => isDescendantOf(value, current)),
        )
        return
      }
      case collapseKey: {
        if (expandable && !currentDisabled && isExpanded(current)) {
          event.preventDefault()
          setExpanded(current, false)
          return
        }
        moveTo(closestEligibleAncestor(current))
        return
      }
      case 'Home':
      case 'End': {
        const navigable = getNavigableValues()
        moveTo(
          event.key === 'Home' ? navigable[0] : navigable[navigable.length - 1],
        )
        return
      }
      case 'Enter': {
        event.preventDefault()
        select(current)
        return
      }
      default:
        break
    }

    if (event.key.length !== 1) {
      return
    }
    if (typeaheadQuery.length === 0) {
      if (event.key === ' ') {
        event.preventDefault()
        select(current)
        return
      }
      if (event.key === '*') {
        event.preventDefault()
        expandAllSiblings(current)
        return
      }
    }
    // Space inside an active query is part of the label ("New file").
    if (runTypeahead(current, event.key) || event.key === ' ') {
      event.preventDefault()
    }
  }

  return {
    modelValue,
    expanded,
    focusedValue,
    tabStopValue,
    dir,
    disabled,
    isSelected,
    isExpanded,
    isDisabled,
    select,
    setExpanded,
    toggleExpanded,
    expandAllSiblings,
    registerNode,
    focusNode,
    handleKeydown,
    handleFocusIn,
    getNavigableValues,
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}
