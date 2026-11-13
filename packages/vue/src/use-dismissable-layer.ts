import {
  isRef,
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/** Why the topmost dismissable layer was asked to close. */
export type DismissReason = 'escape' | 'outside-pointer'

/** Element or nullable ref target accepted by {@link useDismissableLayer}. */
export type DismissableLayerTarget = HTMLElement | null | undefined

/** Single element, ref/getter, or list of elements/refs ignored by outside-pointer checks. */
export type DismissableLayerIgnore =
  | MaybeRefOrGetter<DismissableLayerTarget>
  | readonly MaybeRefOrGetter<DismissableLayerTarget>[]

/** Configuration for {@link useDismissableLayer}. */
export interface UseDismissableLayerOptions {
  /** Called when the topmost layer is dismissed via Escape or outside pointerdown. */
  onDismiss: (
    reason: DismissReason,
    event: KeyboardEvent | PointerEvent,
  ) => void
  /** Ignore pointerdown events outside the layer. Default `false`. */
  disableOutsidePointer?: MaybeRefOrGetter<boolean | undefined>
  /** Ignore Escape keydown events. Default `false`. */
  disableEscape?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Elements (such as the trigger) treated as part of the layer so pressing
   * them does not trigger outside-pointer dismissal.
   */
  ignore?: MaybeRefOrGetter<DismissableLayerIgnore | undefined>
}

interface LayerRecord {
  id: symbol
  element: HTMLElement
  options: UseDismissableLayerOptions
}

/**
 * Module-level stack of active dismissable layers (per copy of `@ghostvue/vue`).
 * Only the topmost layer handles Escape and outside-pointer dismissal so nested
 * overlays close one layer at a time.
 */
const layerStack: LayerRecord[] = []
let listenersAttached = false

function attachDocumentListeners(): void {
  if (listenersAttached) {
    return
  }
  // Capture phase runs before target handlers can stop propagation or detach
  // the pressed node, while still letting inputs call preventDefault on Escape.
  document.addEventListener('keydown', handleDocumentKeyDown, true)
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  listenersAttached = true
}

function detachDocumentListeners(): void {
  if (!listenersAttached) {
    return
  }
  document.removeEventListener('keydown', handleDocumentKeyDown, true)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  listenersAttached = false
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
    return
  }
  const top = layerStack.at(-1)
  if (!top || (toValue(top.options.disableEscape) ?? false)) {
    return
  }
  top.options.onDismiss('escape', event)
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const top = layerStack.at(-1)
  if (!top || (toValue(top.options.disableOutsidePointer) ?? false)) {
    return
  }
  if (isEventInsideElement(event, top.element)) {
    return
  }
  for (const ignored of resolveIgnoredElements(top.options.ignore)) {
    if (isEventInsideElement(event, ignored)) {
      return
    }
  }
  top.options.onDismiss('outside-pointer', event)
}

function isEventInsideElement(
  event: PointerEvent,
  container: HTMLElement,
): boolean {
  const path =
    typeof event.composedPath === 'function' ? event.composedPath() : []
  if (path.length > 0) {
    return path.includes(container)
  }
  return event.target instanceof Node && container.contains(event.target)
}

function isIgnoreArray(
  value: DismissableLayerIgnore,
): value is readonly MaybeRefOrGetter<DismissableLayerTarget>[] {
  return Array.isArray(value)
}

function resolveIgnoredElements(
  ignore: UseDismissableLayerOptions['ignore'],
): HTMLElement[] {
  const outer = toValue(ignore)
  if (!outer) {
    return []
  }
  if (isIgnoreArray(outer)) {
    const elements: HTMLElement[] = []
    for (const item of outer) {
      const element = toValue(item)
      if (element) {
        elements.push(element)
      }
    }
    return elements
  }
  const resolved =
    isRef(outer) || typeof outer === 'function' ? toValue(outer) : outer
  return resolved ? [resolved] : []
}

function insertLayerRecord(record: LayerRecord): void {
  // Vue runs child onMounted hooks before parent onMounted hooks. When nested
  // DOM layers mount in the same render, keep descendants above ancestors.
  const descendantIndex = layerStack.findIndex(
    (existing) =>
      existing.element !== record.element &&
      record.element.contains(existing.element),
  )
  if (descendantIndex >= 0) {
    layerStack.splice(descendantIndex, 0, record)
    return
  }
  layerStack.push(record)
}

/**
 * Dismisses the topmost active overlay layer on Escape or pointerdown outside
 * `el` and any `ignore` elements.
 *
 * Document listeners attach only after mount and detach completely when no
 * layers remain active, keeping SSR setup pure.
 */
export function useDismissableLayer(
  el: MaybeRefOrGetter<DismissableLayerTarget>,
  options: UseDismissableLayerOptions,
): void {
  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(el),
      (element, _previous, onCleanup) => {
        if (!element) {
          return
        }

        const record: LayerRecord = {
          id: Symbol('ghost-dismissable-layer'),
          element,
          options,
        }
        insertLayerRecord(record)
        attachDocumentListeners()

        onCleanup(() => {
          const index = layerStack.lastIndexOf(record)
          if (index >= 0) {
            layerStack.splice(index, 1)
          }
          if (layerStack.length === 0) {
            detachDocumentListeners()
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
