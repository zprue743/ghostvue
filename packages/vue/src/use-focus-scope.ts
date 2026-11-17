import {
  getCurrentInstance,
  inject,
  onMounted,
  onUnmounted,
  provide,
  toValue,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue'

import { isFocusInUpperDismissableLayer } from './dismissable-layer-stack'
import {
  getTabbableElements,
  isFocusable,
  isSameRadioGroup,
} from './get-tabbable-elements'

export interface UseFocusScopeOptions {
  /** When true, focus and Tab/Shift+Tab cannot leave this container. Default false. */
  trapped?: MaybeRefOrGetter<boolean>
  /** When trapped, wrap from last to first (and the reverse). Default true. */
  loop?: MaybeRefOrGetter<boolean>
  /** Focus `[data-autofocus]` or the first tabbable on activate. Default true. */
  autoFocus?: MaybeRefOrGetter<boolean>
  /** Return focus to the previously focused node on deactivate. Default true. */
  restoreFocus?: MaybeRefOrGetter<boolean>
}

interface TrappedScopeEntry {
  readonly id: symbol
  readonly element: HTMLElement
  readonly ancestorIds: readonly symbol[]
  readonly wasConnected: boolean
  readonly getLoop: () => boolean
  lastFocused: HTMLElement | null
}

/**
 * Tracks Vue-tree focus-scope ancestry across `GhostPortal` / `<Teleport>`
 * boundaries where DOM `contains()` cannot observe parent-child relationships.
 */
const focusScopeAncestorsKey: InjectionKey<readonly symbol[]> = Symbol(
  'ghost-focus-scope-ancestors',
)

/**
 * Intentionally module-level (per loaded copy of `@ghostvue/vue`) rather than
 * an isolated per-app `provide`/`inject` stack: a browser document has a single
 * `activeElement`, so multiple Vue apps on the same page must coordinate
 * through one stack rather than fighting over focus, and standalone calls
 * work without a root provider or `app.use(GhostVue)`. Untrapped scopes stay
 * off this stack so a nested popover never disables an ancestor modal's trap.
 * Matches `layerStack` in `dismissable-layer-stack.ts`.
 */
const trappedStack: TrappedScopeEntry[] = []
let listenersAttached = false
let recoveringFocus = false

function attachDocumentListeners(): void {
  if (listenersAttached) {
    return
  }
  // Capture phase lets the trap intercept Tab and focusin before descendant
  // handlers can stop propagation, and a single shared listener pair avoids
  // duplicate checks when multiple trapped scopes stack.
  document.addEventListener('keydown', handleDocumentKeyDown, true)
  document.addEventListener('focusin', handleDocumentFocusIn, true)
  listenersAttached = true
}

function detachDocumentListeners(): void {
  if (!listenersAttached) {
    return
  }
  document.removeEventListener('keydown', handleDocumentKeyDown, true)
  document.removeEventListener('focusin', handleDocumentFocusIn, true)
  listenersAttached = false
}

function pushTrappedScope(entry: TrappedScopeEntry): void {
  // Vue runs child onMounted hooks before parent onMounted hooks. When nested
  // trapped scopes mount in the same render (inline or teleported), keep
  // descendants above ancestors so the innermost trapped scope owns focus.
  const descendantIndex = trappedStack.findIndex(
    (existing) =>
      (existing.element !== entry.element &&
        entry.element.contains(existing.element)) ||
      existing.ancestorIds.includes(entry.id),
  )
  if (descendantIndex >= 0) {
    trappedStack.splice(descendantIndex, 0, entry)
  } else {
    trappedStack.push(entry)
  }
  attachDocumentListeners()
}

function removeTrappedScope(entry: TrappedScopeEntry): void {
  const index = trappedStack.lastIndexOf(entry)
  if (index >= 0) {
    trappedStack.splice(index, 1)
  }
  if (trappedStack.length === 0) {
    detachDocumentListeners()
  }
}

function getTopTrappedScope(): TrappedScopeEntry | undefined {
  // Prune connected scopes whose element left the DOM without Vue cleanup
  // (e.g. imperative DOM removal or HMR) so a stale node cannot wedge lower
  // traps. Detached unit-test mounts start disconnected and stay eligible.
  while (trappedStack.length > 0) {
    const top = trappedStack.at(-1)
    if (top && top.wasConnected && !top.element.isConnected) {
      trappedStack.pop()
      continue
    }
    return top
  }
  detachDocumentListeners()
  return undefined
}

/**
 * Focus entry, optional focus/Tab trap, and restoration for overlays.
 *
 * DOM work runs in `onMounted` / event handlers so SSR setup stays pure.
 * Listeners and stack membership are removed on unmount or when the container
 * leaves the document.
 */
export function useFocusScope(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseFocusScopeOptions,
): void {
  const scopeId = Symbol('ghost-focus-scope')
  const instance = getCurrentInstance()
  const ancestorIds = instance ? inject(focusScopeAncestorsKey, []) : []
  if (instance) {
    provide(focusScopeAncestorsKey, [...ancestorIds, scopeId])
  }

  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(container),
      (element, _previous, onCleanup) => {
        if (!element) {
          return
        }

        const previouslyFocused =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null

        // Register the trap before running focusInitial so an existing outer or
        // sibling-app trap does not intercept the newly mounted scope's autofocus.
        const stopTrap = watch(
          () => toValue(options?.trapped) ?? false,
          (trapped, _wasTrapped, onTrapCleanup) => {
            if (!trapped) {
              return
            }

            const entry: TrappedScopeEntry = {
              id: scopeId,
              element,
              ancestorIds,
              wasConnected: element.isConnected,
              getLoop: () => toValue(options?.loop) ?? true,
              lastFocused:
                document.activeElement instanceof HTMLElement &&
                isElementInScope(element, document.activeElement)
                  ? document.activeElement
                  : null,
            }
            pushTrappedScope(entry)
            onTrapCleanup(() => {
              removeTrappedScope(entry)
            })
          },
          { immediate: true },
        )

        // onMounted has already committed the container, so autofocus can run
        // synchronously. Deferring would race nested scopes and SSR tests.
        if (toValue(options?.autoFocus) ?? true) {
          focusInitial(element)
        }

        onCleanup(() => {
          stopTrap()
          if (
            (toValue(options?.restoreFocus) ?? true) &&
            previouslyFocused?.isConnected
          ) {
            previouslyFocused.focus({ preventScroll: true })
          }
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })
}

function focusInitial(root: HTMLElement): void {
  const designated = root.querySelector<HTMLElement>('[data-autofocus]')
  if (designated && isFocusable(designated)) {
    designated.focus({ preventScroll: true })
    return
  }

  const first = getTabbableElements(root)[0]
  if (first) {
    first.focus({ preventScroll: true })
    return
  }

  root.focus({ preventScroll: true })
}

function isElementInScope(root: HTMLElement, node: Node): boolean {
  if (root.contains(node)) {
    return true
  }
  let rootNode = node.getRootNode()
  while (rootNode instanceof ShadowRoot) {
    if (rootNode.host === root || root.contains(rootNode.host)) {
      return true
    }
    rootNode = rootNode.host.getRootNode()
  }
  return false
}

function handleDocumentFocusIn(event: FocusEvent): void {
  const top = getTopTrappedScope()
  if (!top) {
    return
  }

  const path =
    typeof event.composedPath === 'function' ? event.composedPath() : []
  const target =
    path[0] instanceof Element
      ? path[0]
      : event.target instanceof Element
        ? event.target
        : document.activeElement
  if (!target) {
    return
  }

  if (path.includes(top.element) || isElementInScope(top.element, target)) {
    if (target instanceof HTMLElement) {
      top.lastFocused = target
    }
    return
  }

  // A non-trapped dismissable layer (such as a portaled popover) opened above
  // this scope may hold focus without being pulled back to the modal.
  if (isFocusInUpperDismissableLayer(top.element, target)) {
    return
  }

  if (recoveringFocus) {
    return
  }
  recoverFocus(top)
}

function recoverFocus(entry: TrappedScopeEntry): void {
  recoveringFocus = true
  try {
    const last = entry.lastFocused
    if (last && isElementInScope(entry.element, last) && isFocusable(last)) {
      last.focus({ preventScroll: true })
      return
    }
    focusInitial(entry.element)
    if (
      document.activeElement instanceof HTMLElement &&
      isElementInScope(entry.element, document.activeElement)
    ) {
      entry.lastFocused = document.activeElement
    }
  } finally {
    recoveringFocus = false
  }
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.defaultPrevented) {
    return
  }
  const top = getTopTrappedScope()
  if (!top) {
    return
  }
  // A non-trapped dismissable layer (such as a portaled popover) opened above
  // this scope owns Tab while focus sits inside it.
  if (isFocusInUpperDismissableLayer(top.element, document.activeElement)) {
    return
  }
  handleTab(event, top.element, top.getLoop())
}

function handleTab(
  event: KeyboardEvent,
  root: HTMLElement,
  loop: boolean,
): void {
  const tabbables = getTabbableElements(root)
  const first = tabbables[0]
  const last = tabbables[tabbables.length - 1]
  if (!first || !last) {
    event.preventDefault()
    root.focus({ preventScroll: true })
    return
  }

  const active = document.activeElement
  const isOutside = !active || !isElementInScope(root, active)
  const isNonTabbableInside =
    !isOutside && !(active instanceof HTMLElement && tabbables.includes(active))
  const leavingStart =
    event.shiftKey &&
    (isOutside ||
      active === first ||
      (isNonTabbableInside && isBeforeTabbables(active, tabbables)))
  const leavingEnd =
    !event.shiftKey &&
    (isOutside ||
      active === last ||
      (isNonTabbableInside && isAfterTabbables(active, tabbables)))

  if (!leavingStart && !leavingEnd) {
    return
  }

  event.preventDefault()
  if (!loop && !isOutside) {
    return
  }

  const target = event.shiftKey ? last : first
  target.focus({ preventScroll: true })
}

function isBeforeTabbables(active: Element, tabbables: HTMLElement[]): boolean {
  return tabbables.every(
    (tabbable) =>
      isSameRadioGroup(active, tabbable) ||
      Boolean(
        tabbable.compareDocumentPosition(active) &
        Node.DOCUMENT_POSITION_PRECEDING,
      ),
  )
}

function isAfterTabbables(active: Element, tabbables: HTMLElement[]): boolean {
  return tabbables.every(
    (tabbable) =>
      isSameRadioGroup(active, tabbable) ||
      Boolean(
        tabbable.compareDocumentPosition(active) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
  )
}
