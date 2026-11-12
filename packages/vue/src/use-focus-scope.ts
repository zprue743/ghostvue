import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

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

/**
 * Only the innermost trapped scope owns Tab. Untrapped scopes still autofocus
 * and restore, but they must not sit on this stack or a nested popover would
 * disable an ancestor dialog's trap.
 */
const trappedStack: symbol[] = []

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

            trappedStack.push(scopeId)
            const onKeyDown = (event: KeyboardEvent): void => {
              handleTab(event, element, scopeId, toValue(options?.loop) ?? true)
            }
            document.addEventListener('keydown', onKeyDown, true)
            onTrapCleanup(() => {
              document.removeEventListener('keydown', onKeyDown, true)
              const index = trappedStack.lastIndexOf(scopeId)
              if (index >= 0) {
                trappedStack.splice(index, 1)
              }
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
  if (trappedStack.at(-1) !== scopeId) {
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
