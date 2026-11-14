import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Schedules reconciliation after the `reset` event has fully dispatched so
 * `defaultPrevented` is final (including listeners on `document` and `window`
 * registered after the library listener).
 */
export function afterNativeFormReset(event: Event, apply: () => void): void {
  queueMicrotask(() => {
    if (event.defaultPrevented) return
    apply()
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
  function onDocumentReset(event: Event): void {
    const element = getElement()
    const target = event.target
    if (!element || !(target instanceof HTMLFormElement)) return
    if (element.form !== target) return
    afterNativeFormReset(event, apply)
  }

  onMounted(() => {
    document.addEventListener('reset', onDocumentReset)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('reset', onDocumentReset)
  })
}
