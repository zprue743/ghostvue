import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Reconciles Vue state when a native form reset will commit. Call from a
 * bubble-phase listener (for example on `document`) so `preventDefault` on the
 * form is visible before the browser restores control defaults.
 */
export function afterNativeFormReset(event: Event, apply: () => void): void {
  if (event.defaultPrevented) return
  apply()
}

/**
 * Listens for a native `reset` on the control's current owner form. Uses bubble
 * phase on `document` so `preventDefault` on the form runs first.
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
