import { nextTick, onMounted, onUnmounted, onUpdated, type Ref } from 'vue'

/** Whether a field hint/error host exposes non-empty visible content. */
export function fieldPartHostHasContent(element: HTMLElement | null): boolean {
  if (!element) {
    return false
  }
  if (element.textContent.trim().length > 0) {
    return true
  }
  return element.children.length > 0
}

/**
 * Tracks part visibility from mounted DOM after each render. Never invokes slots
 * outside the render phase; parent reactive slot content updates land in onUpdated.
 */
export function useGhostFieldPartContent(
  hostRef: Ref<HTMLElement | null>,
  onVisibleChange: (visible: boolean) => void,
): void {
  let visible = false

  function syncFromDom(): void {
    const next = fieldPartHostHasContent(hostRef.value)
    if (next === visible) {
      return
    }
    visible = next
    onVisibleChange(next)
  }

  onMounted(() => {
    void nextTick(syncFromDom)
  })
  onUpdated(syncFromDom)
  onUnmounted(() => {
    if (visible) {
      visible = false
      onVisibleChange(false)
    }
  })
}
