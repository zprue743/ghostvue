import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Schedules reconciliation after the `reset` event has fully dispatched so
 * `defaultPrevented` is final (including listeners on `document` and `window`
 * registered after the library listener).
 *
 * Uses a macrotask (`setTimeout(0)`), not a microtask: after each listener the
 * engine can drain microtasks while dispatch is still in progress (for example
 * when reset comes from a real reset-button click). A microtask checkpoint can
 * run before a later `window` listener calls `preventDefault`; a task runs only
 * after the whole dispatch finishes.
 */
export function afterNativeFormReset(
  event: Event,
  apply: () => void,
): () => void {
  const id = globalThis.setTimeout(() => {
    if (event.defaultPrevented) return
    apply()
  }, 0)
  return () => {
    globalThis.clearTimeout(id)
  }
}

/** Awaits the macrotask scheduled by {@link afterNativeFormReset} (for tests). */
export function waitForFormResetDeferral(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0)
  })
}

/**
 * Listens for a native `reset` on the control's current owner form. Uses bubble
 * phase on `document` so form-scoped `preventDefault` runs during dispatch.
 */
export function useNativeFormReset(
  getElement: () => (HTMLElement & { form?: HTMLFormElement | null }) | null,
  apply: () => void,
): void {
  const pendingReconciles = new Set<() => void>()

  function onDocumentReset(event: Event): void {
    const element = getElement()
    const target = event.target
    if (!element || !(target instanceof HTMLFormElement)) return
    if (element.form !== target) return
    const cancel = afterNativeFormReset(event, () => {
      pendingReconciles.delete(cancel)
      apply()
    })
    pendingReconciles.add(cancel)
  }

  onMounted(() => {
    document.addEventListener('reset', onDocumentReset)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('reset', onDocumentReset)
    for (const cancel of pendingReconciles) {
      cancel()
    }
    pendingReconciles.clear()
  })
}
