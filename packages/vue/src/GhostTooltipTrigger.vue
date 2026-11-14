<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostTooltipContextKey,
  resolveTooltipHtmlElement,
  type GhostTooltipTriggerElement,
  type GhostTooltipTriggerExposed,
} from './ghost-tooltip'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the trigger control. */
    as?: GhostTooltipTriggerElement
    /** Prevents scheduling show on hover or focus when `true`. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const injected = inject(ghostTooltipContextKey)
if (!injected) {
  throw new Error('GhostTooltipTrigger must be used inside GhostTooltip')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveTooltipHtmlElement(hostRef.value))

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const triggerId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultTriggerId.value
})

context.setTriggerRegistered(true)

watch(
  triggerId,
  (id) => {
    context.setTriggerId(id === context.defaultTriggerId.value ? null : id)
  },
  { immediate: true },
)

watch(
  element,
  (el) => {
    context.setTriggerElement(el)
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  context.setTriggerElement(null)
  context.setTriggerId(null)
  context.setTriggerRegistered(false)
})

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'aria-describedby' &&
      key !== 'onPointerenter' &&
      key !== 'onPointerleave' &&
      key !== 'onFocusin' &&
      key !== 'onFocusout'
    ) {
      rest[key] = value
    }
  }

  const customType = attrs['type']
  const customRole = attrs['role']
  const customTabindex = attrs['tabindex']
  const customDescribedBy = attrs['aria-describedby']

  const base: Record<string, unknown> = {
    ...rest,
    id: triggerId.value,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }

  if (context.isOpen.value) {
    base['aria-describedby'] =
      typeof customDescribedBy === 'string' && customDescribedBy.length > 0
        ? customDescribedBy
        : context.contentId.value
  }

  if (isNativeButtonTag.value) {
    base['type'] = customType ?? 'button'
    base['disabled'] = props.disabled
  } else if (isComponentHost.value) {
    base['disabled'] = props.disabled
    if (customType !== undefined) {
      base['type'] = customType
    }
  } else {
    base['role'] = customRole ?? 'button'
    base['tabindex'] = customTabindex ?? (props.disabled ? undefined : 0)
    if (props.disabled) {
      base['aria-disabled'] = 'true'
    }
  }

  return base
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
  if (props.disabled) {
    return
  }
  invokeAttrHandler(attrs['onPointerenter'], event)
  if (event.defaultPrevented) {
    return
  }
  context.scheduleShow()
}

function handlePointerLeave(event: PointerEvent): void {
  invokeAttrHandler(attrs['onPointerleave'], event)
  if (event.defaultPrevented) {
    return
  }
  context.scheduleHide()
}

function handleFocusIn(event: FocusEvent): void {
  if (props.disabled) {
    return
  }
  invokeAttrHandler(attrs['onFocusin'], event)
  if (event.defaultPrevented) {
    return
  }
  context.scheduleShow()
}

function handleFocusOut(event: FocusEvent): void {
  invokeAttrHandler(attrs['onFocusout'], event)
  if (event.defaultPrevented) {
    return
  }
  const next = event.relatedTarget
  const el = element.value
  if (el && next instanceof Node && el.contains(next)) {
    return
  }
  context.scheduleHide()
}

defineExpose<GhostTooltipTriggerExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="triggerAttrs"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <slot />
  </component>
</template>
