import {
  isRef,
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import {
  getDismissableLayers,
  getTopDismissableLayer,
  hasDismissableLayers,
  pushDismissableLayer,
  removeDismissableLayer,
  type DismissableLayerEntry,
} from './dismissable-layer-stack'
import { isImeComposing } from './is-ime-composing'

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
  // Escape during IME composition cancels the composition, not the layer.
  // `isImeComposing` also covers WebKit's keyCode 229 keydown that arrives
  // after `compositionend` with `isComposing === false`.
  if (
    event.key !== 'Escape' ||
    event.defaultPrevented ||
    isImeComposing(event)
  ) {
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
  const layers = getDismissableLayers()
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (!layer) {
      continue
    }
    if (layer.escapeOnly) {
      // Pressing an escape-only layer (a tooltip, possibly portaled outside
      // its owning overlay) is not an outside interaction for layers beneath
      // it; pressing anywhere else passes through to the next layer down so a
      // tooltip never blocks outside-pointer dismissal of a popover or dialog.
      if (isEventInsideElement(event, layer.element)) {
        return
      }
      continue
    }
    dismissOnOutsidePointer(event, layer)
    return
  }
}

function dismissOnOutsidePointer(
  event: PointerEvent,
  layer: DismissableLayerEntry,
): void {
  const options = layerOptions.get(layer.id)
  if (!options || (toValue(options.disableOutsidePointer) ?? false)) {
    return
  }
  if (isEventInsideElement(event, layer.element)) {
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
  registerDismissableLayer(el, options, false)
}

/**
 * Internal (not part of the public entry point): joins `el` to the shared
 * layer stack for `Escape` ordering only. Used by `GhostTooltipContent` so one
 * `Escape` closes a tooltip opened above a dialog or popover without also
 * closing that overlay, while the tooltip stays out of outside-pointer
 * dismissal and modal focus ownership (it is not a modal or click-away layer).
 * A separate per-component `document` listener cannot provide that ordering:
 * which listener runs first depends on registration order, so local
 * `preventDefault()` alone is unreliable.
 */
export function useEscapeDismissableLayer(
  el: MaybeRefOrGetter<DismissableLayerTarget>,
  onEscape: (event: KeyboardEvent) => void,
): void {
  registerDismissableLayer(
    el,
    {
      disableOutsidePointer: true,
      onDismiss: (reason, event) => {
        if (reason === 'escape' && event instanceof KeyboardEvent) {
          onEscape(event)
        }
      },
    },
    true,
  )
}

function registerDismissableLayer(
  el: MaybeRefOrGetter<DismissableLayerTarget>,
  options: UseDismissableLayerOptions,
  escapeOnly: boolean,
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
          escapeOnly,
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
