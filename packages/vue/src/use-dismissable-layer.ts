import {
  isRef,
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import {
  getTopDismissableLayer,
  hasDismissableLayers,
  pushDismissableLayer,
  removeDismissableLayer,
  type DismissableLayerEntry,
} from './dismissable-layer-stack'

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

const layerOptions = new Map<symbol, UseDismissableLayerOptions>()
let listenersAttached = false

function attachDocumentListeners(): void {
  if (listenersAttached) {
    return
  }
  // Bubble phase for keydown lets descendants inside the layer (such as inputs)
  // call event.preventDefault() on Escape before dismissal runs. Capture phase
  // for pointerdown runs before target handlers can stop propagation or detach
  // the pressed node.
  document.addEventListener('keydown', handleDocumentKeyDown, false)
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  listenersAttached = true
}

function detachDocumentListeners(): void {
  if (!listenersAttached) {
    return
  }
  document.removeEventListener('keydown', handleDocumentKeyDown, false)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  listenersAttached = false
}

function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
    return
  }
  const top = getTopDismissableLayer()
  const options = top ? layerOptions.get(top.id) : undefined
  if (!options || (toValue(options.disableEscape) ?? false)) {
    return
  }
  options.onDismiss('escape', event)
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const top = getTopDismissableLayer()
  const options = top ? layerOptions.get(top.id) : undefined
  if (!top || !options || (toValue(options.disableOutsidePointer) ?? false)) {
    return
  }
  if (isEventInsideElement(event, top.element)) {
    return
  }
  for (const ignored of resolveIgnoredElements(options.ignore)) {
    if (isEventInsideElement(event, ignored)) {
      return
    }
  }
  options.onDismiss('outside-pointer', event)
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

        const entry: DismissableLayerEntry = {
          id: Symbol('ghost-dismissable-layer'),
          element,
        }
        layerOptions.set(entry.id, options)
        pushDismissableLayer(entry)
        attachDocumentListeners()

        onCleanup(() => {
          removeDismissableLayer(entry)
          layerOptions.delete(entry.id)
          if (!hasDismissableLayers()) {
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
