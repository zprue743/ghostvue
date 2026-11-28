<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'
import {
  ghostHoverCardContextKey,
  resolveHoverCardHtmlElement,
  type GhostHoverCardContentElement,
  type GhostHoverCardContentExposed,
  type GhostHoverCardFlipOptions,
  type GhostHoverCardOffsetOptions,
  type GhostHoverCardPlacement,
  type GhostHoverCardShiftOptions,
  type GhostHoverCardStrategy,
} from './ghost-hover-card'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useGhostPresence } from './use-ghost-presence'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the card surface. */
    as?: GhostHoverCardContentElement
    /** Preferred placement relative to the trigger. */
    placement?: GhostHoverCardPlacement
    /** Distance or axis offsets passed to `useFloating`. */
    offset?: GhostHoverCardOffsetOptions | boolean | undefined
    /** Flip to an opposite side when overflowing the viewport or boundary. */
    flip?: boolean | GhostHoverCardFlipOptions
    /** Shift along the cross axis to keep the card in view. */
    shift?: boolean | GhostHoverCardShiftOptions
    /** CSS positioning strategy passed to `useFloating`. */
    strategy?: GhostHoverCardStrategy
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    placement: 'bottom',
    offset: undefined,
    flip: true,
    shift: true,
    strategy: 'absolute',
    portal: true,
    portalTo: 'body',
  },
)

const injected = inject(ghostHoverCardContextKey)
if (!injected) {
  throw new Error('GhostHoverCardContent must be used inside GhostHoverCard')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

// Logical `isOpen` drives dismissal, released immediately on
// close; presence only keeps the node mounted while its own exit motion runs.
// Closing before the first position resolved skips retention: the surface was
// still `visibility: hidden`, so there is nothing to animate out.
const presence = useGhostPresence({
  present: () => context.isOpen.value,
  element: () => resolveHoverCardHtmlElement(hostRef.value),
  disabled: () => !isPositioned.value,
})

/** Mounted surface, live while `'open'` or `'exiting'`. */
const presentElement = computed(() =>
  presence.isPresent.value ? resolveHoverCardHtmlElement(hostRef.value) : null,
)
/** Open-gated surface used by the interactive subsystems. */
const contentElement = computed(() =>
  context.isOpen.value ? presentElement.value : null,
)

const contentId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultContentId.value
})

watch(
  [() => context.isOpen.value, contentId],
  ([open, id]) => {
    if (open && id !== context.defaultContentId.value) {
      context.setContentId(id)
    } else {
      context.setContentId(null)
    }
  },
  { immediate: true },
)

watch(
  contentElement,
  (el) => {
    context.setContentElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setContentId(null)
  context.setContentElement(null)
})

// Bound to the mounted surface so coordinates, `data-placement` and scroll
// tracking persist through the exit instead of snapping to (0, 0).
const floating = useFloating(
  () => context.triggerElement.value,
  presentElement,
  {
    placement: () => props.placement,
    offset: () => props.offset,
    flip: () => props.flip,
    shift: () => props.shift,
    strategy: () => props.strategy,
  },
)

const isPositioned = computed(
  () => !context.triggerRegistered.value || floating.isPositioned.value,
)

useDismissableLayer(contentElement, {
  ignore: () => context.triggerElement.value,
  disableEscape: () => !context.closeOnEscape.value,
  onDismiss: () => {
    context.hideImmediate()
  },
})

const hasExplicitLabel = computed(
  () =>
    attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined,
)

const contentAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'class' &&
      key !== 'style' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'onPointerenter' &&
      key !== 'onPointerleave' &&
      key !== 'onFocusin' &&
      key !== 'onFocusout'
    ) {
      rest[key] = value
    }
  }

  const result: Record<string, unknown> = {
    ...rest,
    id: contentId.value,
    role: attrs['role'] ?? 'dialog',
    tabindex: attrs['tabindex'] ?? -1,
    'data-part': 'content',
    'data-state': presence.dataState.value,
    'data-hoverable': '',
  }

  if (!hasExplicitLabel.value && context.triggerRegistered.value) {
    result['aria-labelledby'] = context.triggerId.value
  }

  if (presence.isExiting.value) {
    // Out of the accessibility tree and unfocusable while it fades; a
    // consumer `inert` is passed through above and returns on reopen.
    result['inert'] = true
  }

  return result
})

function invokeAttrHandler(handler: unknown, event: Event): void {
  if (typeof handler === 'function') {
    ;(handler as (event: Event) => void)(event)
  } else if (Array.isArray(handler)) {
    for (const fn of handler) {
      if (typeof fn === 'function') {
        ;(fn as (event: Event) => void)(event)
      }
    }
  }
}

function handlePointerEnter(event: PointerEvent): void {
  invokeAttrHandler(attrs['onPointerenter'], event)
  if (event.defaultPrevented) {
    return
  }
  context.notifyContentPointerEnter()
}

function handlePointerLeave(event: PointerEvent): void {
  invokeAttrHandler(attrs['onPointerleave'], event)
  if (event.defaultPrevented) {
    return
  }
  context.notifyContentPointerLeave()
}

function handleFocusIn(event: FocusEvent): void {
  invokeAttrHandler(attrs['onFocusin'], event)
  if (event.defaultPrevented) {
    return
  }
  context.notifyContentFocusIn()
}

function handleFocusOut(event: FocusEvent): void {
  invokeAttrHandler(attrs['onFocusout'], event)
  if (event.defaultPrevented) {
    return
  }
  if (
    event.relatedTarget instanceof Node &&
    context.contentElement.value?.contains(event.relatedTarget)
  ) {
    return
  }
  context.notifyContentFocusOut(event.relatedTarget)
}

const contentStyle = computed(() => [
  {
    position: floating.strategy.value,
    left: `${String(floating.x.value)}px`,
    top: `${String(floating.y.value)}px`,
    ...(isPositioned.value ? {} : { visibility: 'hidden' as const }),
    pointerEvents: 'auto' as const,
  },
  attrs.style,
  // After consumer style: a departing surface never intercepts clicks meant
  // for the controls it still covers mid-fade.
  presence.isExiting.value ? { pointerEvents: 'none' as const } : undefined,
])

defineExpose<GhostHoverCardContentExposed>({
  get element() {
    return presentElement.value
  },
  focus(options?: FocusOptions) {
    presentElement.value?.focus(options)
  },
  blur() {
    presentElement.value?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="presence.isPresent.value"
      ref="host"
      :class="['ghost-hover-card-content', attrs.class]"
      :style="contentStyle"
      v-bind="contentAttrs"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
