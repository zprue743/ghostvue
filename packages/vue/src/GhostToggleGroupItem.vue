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
  ghostToggleGroupContextKey,
  resolveToggleGroupHtmlElement,
  type GhostToggleGroupItemElement,
  type GhostToggleGroupItemExposed,
} from './ghost-toggle-group'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component for the toggle control. */
    as?: GhostToggleGroupItemElement
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

const context = inject(ghostToggleGroupContextKey)
if (!context) {
  throw new Error('GhostToggleGroupItem must be used inside GhostToggleGroup')
}
const group = context

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveToggleGroupHtmlElement(hostRef.value))

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const defaultItemId = useGhostId('ghost-toggle-group-item')
const itemId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultItemId.value
})

const itemDisabled = computed(() => props.disabled || group.groupDisabled.value)

watch(
  [() => props.value, () => itemDisabled.value],
  ([value, disabled]) => {
    group.registerItem(value, disabled)
  },
  { immediate: true },
)

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

const receivesTabStop = computed(
  () => !itemDisabled.value && group.tabStopValue.value === props.value,
)

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
  const customRole = attrs['role']
  const customTabindex = attrs['tabindex']
  const extraClass = attrs.class

  const base: Record<string, unknown> = {
    ...rest,
    id: itemId.value,
    class: extraClass
      ? ['ghost-toggle-group-item', extraClass]
      : 'ghost-toggle-group-item',
    'data-ghost-toggle-group-value': props.value,
    'aria-pressed': pressed.value ? 'true' : 'false',
    'data-part': 'item',
    'data-ghost-toggle-group': '',
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
  } else {
    base['role'] = customRole ?? 'button'
    base['tabindex'] = customTabindex ?? (receivesTabStop.value ? 0 : -1)
    if (itemDisabled.value) {
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
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  if (itemDisabled.value) {
    event.preventDefault()
    return
  }
  if (event.defaultPrevented) {
    return
  }
  const el = element.value
  if (el instanceof HTMLButtonElement) {
    return
  }
  if (
    event.key === 'Enter' &&
    el instanceof HTMLAnchorElement &&
    el.hasAttribute('href')
  ) {
    return
  }
  event.preventDefault()
  group.toggle(props.value)
}

defineExpose<GhostToggleGroupItemExposed>({
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
