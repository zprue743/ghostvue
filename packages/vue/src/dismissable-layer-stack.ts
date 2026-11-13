/**
 * Internal module-level stack of active dismissable layers (per copy of
 * `@ghostvue/vue`). Shared between `useDismissableLayer` and `useFocusScope`
 * without a circular import or new public exports.
 */
export interface DismissableLayerEntry {
  readonly id: symbol
  readonly element: HTMLElement
}

const layerStack: DismissableLayerEntry[] = []

export function pushDismissableLayer(entry: DismissableLayerEntry): void {
  // Vue runs child onMounted hooks before parent onMounted hooks. When nested
  // DOM layers mount in the same render, keep descendants above ancestors.
  const descendantIndex = layerStack.findIndex(
    (existing) =>
      existing.element !== entry.element &&
      entry.element.contains(existing.element),
  )
  if (descendantIndex >= 0) {
    layerStack.splice(descendantIndex, 0, entry)
    return
  }
  layerStack.push(entry)
}

export function removeDismissableLayer(entry: DismissableLayerEntry): void {
  const index = layerStack.lastIndexOf(entry)
  if (index >= 0) {
    layerStack.splice(index, 1)
  }
}

export function getTopDismissableLayer(): DismissableLayerEntry | undefined {
  return layerStack.at(-1)
}

export function hasDismissableLayers(): boolean {
  return layerStack.length > 0
}

/**
 * Returns `true` when `activeElement` sits inside a dismissable layer stacked
 * above the layer owning `scopeRoot`. Used by a trapped `useFocusScope` to
 * ignore `Tab` while focus lives inside a portaled popover opened from the modal.
 */
export function isFocusInUpperDismissableLayer(
  scopeRoot: HTMLElement,
  activeElement: Element | null,
): boolean {
  if (!activeElement || scopeRoot.contains(activeElement)) {
    return false
  }

  let scopeLayerIndex = -1
  for (let i = layerStack.length - 1; i >= 0; i -= 1) {
    if (layerStack[i]?.element === scopeRoot) {
      scopeLayerIndex = i
      break
    }
  }
  if (scopeLayerIndex < 0) {
    for (let i = layerStack.length - 1; i >= 0; i -= 1) {
      if (layerStack[i]?.element.contains(scopeRoot)) {
        scopeLayerIndex = i
        break
      }
    }
  }

  for (let index = scopeLayerIndex + 1; index < layerStack.length; index += 1) {
    const layer = layerStack[index]
    if (layer?.element.contains(activeElement)) {
      return true
    }
  }

  return false
}
