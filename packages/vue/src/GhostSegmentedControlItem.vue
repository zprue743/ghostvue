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
  ghostSegmentedControlContextKey,
  resolveSegmentedControlHtmlElement,
  type GhostSegmentedControlItemElement,
  type GhostSegmentedControlItemExposed,
} from './ghost-segmented-control'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component for the segment control. */
    as?: GhostSegmentedControlItemElement
    /** Stable value for this item in the group model. */
    value: string
    /** Disables toggling and roving focus for this item. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = inject(ghostSegmentedControlContextKey)
if (!context) {
  throw new Error(
    'GhostSegmentedControlItem must be used inside GhostSegmentedControl',
  )
}
const group = context

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() =>
  resolveSegmentedControlHtmlElement(hostRef.value),
)

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const defaultItemId = useGhostId('ghost-segmented-control-item')
const itemId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultItemId.value
})

const itemDisabled = computed(() => props.disabled || group.groupDisabled.value)

// Synchronous registration keeps indicator CSS variables correct during SSR.
group.registerItem(props.value, itemDisabled.value)

watch([() => props.value, () => itemDisabled.value], ([value, disabled]) => {
  group.registerItem(value, disabled)
})

watch(
  () => itemDisabled.value,
  (disabled) => {
    group.setItemDisabled(props.value, disabled)
  },
)

watch(
  () => props.value,
  (value, previous) => {
    if (previous) {
      group.unregisterItem(previous)
    }
    group.registerItem(value, itemDisabled.value)
  },
)

onUnmounted(() => {
  group.unregisterItem(props.value)
})

const pressed = computed(() => group.isPressed(props.value))

const itemAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'class' &&
      key !== 'tabindex' &&
      key !== 'onClick' &&
      key !== 'onKeydown'
    ) {
      rest[key] = value
    }
  }

  const customType = attrs['type']
  const extraClass = attrs.class

  const base: Record<string, unknown> = {
    ...rest,
    id: itemId.value,
    class: extraClass
      ? ['ghost-segmented-control-item', extraClass]
      : 'ghost-segmented-control-item',
    'data-ghost-segmented-control-value': props.value,
    'aria-pressed': pressed.value ? 'true' : 'false',
    'data-part': 'item',
    'data-ghost-segmented-control': '',
    'data-state': pressed.value ? 'on' : 'off',
  }

  if (isNativeButtonTag.value) {
    base['type'] = customType ?? 'button'
    base['disabled'] = itemDisabled.value || undefined
  } else if (isComponentHost.value) {
    base['disabled'] = itemDisabled.value
    if (customType !== undefined) {
      base['type'] = customType
    }
  } else if (itemDisabled.value) {
    base['aria-disabled'] = 'true'
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

function handleClick(event: MouseEvent): void {
  if (itemDisabled.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  invokeAttrHandler(attrs['onClick'], event)
  if (event.defaultPrevented) {
    return
  }
  group.toggle(props.value)
}

function handleKeydown(event: KeyboardEvent): void {
  if (!itemDisabled.value) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
}

defineExpose<GhostSegmentedControlItemExposed>({
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
    v-bind="itemAttrs"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>
