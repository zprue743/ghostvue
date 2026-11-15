import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import { isFocusInUpperDismissableLayer } from './dismissable-layer-stack'
import { getTabbableElements, isFocusable } from './get-tabbable-elements'

export interface UseFocusScopeOptions {
  /** When true, Tab/Shift+Tab cannot leave this container. Default false. */
  trapped?: MaybeRefOrGetter<boolean>
  /** When trapped, wrap from last to first (and the reverse). Default true. */
  loop?: MaybeRefOrGetter<boolean>
  /** Focus the first tabbable, or `[data-autofocus]`, on activate. Default true. */
  autoFocus?: MaybeRefOrGetter<boolean>
  /** Return focus to the previously focused node on deactivate. Default true. */
  restoreFocus?: MaybeRefOrGetter<boolean>
}

interface TrappedScopeEntry {
  readonly id: symbol
  readonly element: HTMLElement
}

/**
 * Only the innermost trapped scope owns Tab. Untrapped scopes still autofocus
 * and restore, but they must not sit on this stack or a nested popover would
 * disable an ancestor dialog's trap.
 */
const trappedStack: TrappedScopeEntry[] = []

function pushTrappedScope(entry: TrappedScopeEntry): void {
  // Vue runs child onMounted hooks before parent onMounted hooks. When nested
  // trapped scopes mount in the same render, keep descendants above ancestors
  // so the innermost trapped scope owns Tab regardless of mount order.
  const descendantIndex = trappedStack.findIndex(
    (existing) =>
      existing.element !== entry.element &&
      entry.element.contains(existing.element),
  )
  if (descendantIndex >= 0) {
    trappedStack.splice(descendantIndex, 0, entry)
    return
  }
  trappedStack.push(entry)
}

function removeTrappedScope(entry: TrappedScopeEntry): void {
  const index = trappedStack.lastIndexOf(entry)
  if (index >= 0) {
    trappedStack.splice(index, 1)
  }
}

/**
 * Focus entry, optional Tab trap, and restoration for overlays.
 *
 * DOM work runs in `onMounted` / event handlers so SSR setup stays pure.
 * Listeners and stack membership are removed on unmount or when the container
 * leaves the document.
 */
export function useFocusScope(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseFocusScopeOptions,
): void {
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
        const scopeId = Symbol('ghost-focus-scope')

        // onMounted has already committed the container, so autofocus can run
        // synchronously. Deferring would race nested scopes and SSR tests.
        if (toValue(options?.autoFocus) ?? true) {
          focusInitial(element)
        }

        const stopTrap = watch(
          () => toValue(options?.trapped) ?? false,
          (trapped, _wasTrapped, onTrapCleanup) => {
            if (!trapped) {
              return
            }

            const entry: TrappedScopeEntry = { id: scopeId, element }
            pushTrappedScope(entry)
            const onKeyDown = (event: KeyboardEvent): void => {
              handleTab(event, element, scopeId, toValue(options?.loop) ?? true)
            }
            document.addEventListener('keydown', onKeyDown, true)
            onTrapCleanup(() => {
              document.removeEventListener('keydown', onKeyDown, true)
              removeTrappedScope(entry)
            })
          },
          { immediate: true },
        )

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

function handleTab(
  event: KeyboardEvent,
  root: HTMLElement,
  scopeId: symbol,
  loop: boolean,
): void {
  if (event.key !== 'Tab' || event.defaultPrevented) {
    return
  }
  if (trappedStack.at(-1)?.id !== scopeId) {
    return
  }
  // A non-trapped dismissable layer (such as a portaled popover) opened above
  // this scope owns Tab while focus sits inside it.
  if (isFocusInUpperDismissableLayer(root, document.activeElement)) {
    return
  }

  const tabbables = getTabbableElements(root)
  const first = tabbables[0]
  const last = tabbables[tabbables.length - 1]
  if (!first || !last) {
    event.preventDefault()
    root.focus({ preventScroll: true })
    return
  }

  const active = document.activeElement
  const leavingStart =
    event.shiftKey && (active === first || !root.contains(active))
  const leavingEnd =
    !event.shiftKey && (active === last || !root.contains(active))

  if (!leavingStart && !leavingEnd) {
    return
  }

  event.preventDefault()
  if (!loop && root.contains(active)) {
    return
  }

  const target = event.shiftKey ? last : first
  target.focus({ preventScroll: true })
}
