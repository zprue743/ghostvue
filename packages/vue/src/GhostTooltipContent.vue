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
  ghostTooltipContextKey,
  resolveTooltipHtmlElement,
  type GhostTooltipContentElement,
  type GhostTooltipContentExposed,
  type GhostTooltipFlipOptions,
  type GhostTooltipOffsetOptions,
  type GhostTooltipPlacement,
  type GhostTooltipShiftOptions,
  type GhostTooltipStrategy,
} from './ghost-tooltip'
import { useFloating } from './use-floating'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the tooltip surface. */
    as?: GhostTooltipContentElement
    /** Preferred placement relative to the trigger. */
    placement?: GhostTooltipPlacement
    /** Distance or axis offsets passed to `useFloating`. */
    offset?: GhostTooltipOffsetOptions | boolean | undefined
    /** Flip to an opposite side when overflowing the viewport or boundary. */
    flip?: boolean | GhostTooltipFlipOptions
    /** Shift along the cross axis to keep the tooltip in view. */
    shift?: boolean | GhostTooltipShiftOptions
    /** CSS positioning strategy passed to `useFloating`. */
    strategy?: GhostTooltipStrategy
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    placement: 'top',
    offset: undefined,
    flip: true,
    shift: true,
    strategy: 'absolute',
    portal: true,
    portalTo: 'body',
  },
)

const injected = inject(ghostTooltipContextKey)
if (!injected) {
  throw new Error('GhostTooltipContent must be used inside GhostTooltip')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const contentElement = computed(() =>
  context.isOpen.value ? resolveTooltipHtmlElement(hostRef.value) : null,
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

onUnmounted(() => {
  context.setContentId(null)
})

const floating = useFloating(
  () => context.triggerElement.value,
  contentElement,
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
      key !== 'onPointerleave'
    ) {
      rest[key] = value
    }
  }

  const hoverable = !context.disableHoverableContent.value

  return {
    ...rest,
    id: contentId.value,
    role: attrs['role'] ?? 'tooltip',
    'data-part': 'content',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    ...(hoverable ? { 'data-hoverable': '' } : {}),
  }
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

const contentStyle = computed(() => [
  {
    position: floating.strategy.value,
    left: `${String(floating.x.value)}px`,
    top: `${String(floating.y.value)}px`,
    ...(isPositioned.value ? {} : { visibility: 'hidden' as const }),
    ...(!context.disableHoverableContent.value
      ? { pointerEvents: 'auto' as const }
      : { pointerEvents: 'none' as const }),
  },
  attrs.style,
])

defineExpose<GhostTooltipContentExposed>({
  get element() {
    return contentElement.value
  },
  focus(options?: FocusOptions) {
    contentElement.value?.focus(options)
  },
  blur() {
    contentElement.value?.blur()
  },
})
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="context.isOpen.value"
      ref="host"
      class="ghost-tooltip-content"
      :style="contentStyle"
      v-bind="contentAttrs"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
