<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostContextMenuContextKey,
  ghostContextMenuRadioGroupContextKey,
  resolveContextMenuHtmlElement,
  type GhostContextMenuRadioItemElement,
  type GhostContextMenuRadioItemExposed,
} from './ghost-context-menu'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostContextMenuRadioItemElement
    value: string
    disabled?: boolean
  }>(),
  {
    as: 'div',
    disabled: false,
  },
)

const emit = defineEmits<{
  select: [value: string, event: Event]
}>()

const menuContext = inject(ghostContextMenuContextKey)
const radioGroup = inject(ghostContextMenuRadioGroupContextKey)
if (!menuContext) {
  throw new Error(
    'GhostContextMenuRadioItem must be used inside GhostContextMenu',
  )
}
if (!radioGroup) {
  throw new Error(
    'GhostContextMenuRadioItem must be used inside GhostContextMenuRadioGroup',
  )
}
const menu = menuContext
const group = radioGroup

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveContextMenuHtmlElement(hostRef.value))

const isDisabled = computed(() => group.disabled.value || props.disabled)
const checked = computed(() => group.isSelected(props.value))

const itemAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'onClick') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    role: 'menuitemradio',
    tabindex: -1,
    'aria-checked': checked.value ? 'true' : 'false',
    'aria-disabled': isDisabled.value ? 'true' : undefined,
    'data-part': 'radio-item',
    'data-value': props.value,
    'data-state': checked.value ? 'checked' : undefined,
    'data-disabled': isDisabled.value ? '' : undefined,
  }
})

function handleClick(event: MouseEvent): void {
  if (isDisabled.value) {
    event.preventDefault()
    return
  }
  const custom = attrs['onClick']
  if (typeof custom === 'function') {
    ;(custom as (event: MouseEvent) => void)(event)
  } else if (Array.isArray(custom)) {
    for (const fn of custom) {
      if (typeof fn === 'function') {
        ;(fn as (event: MouseEvent) => void)(event)
      }
    }
  }
  group.select(props.value)
  emit('select', props.value, event)
  if (event.defaultPrevented) {
    return
  }
  menu.close()
}

defineExpose<GhostContextMenuRadioItemExposed>({
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
  <component :is="as" ref="host" v-bind="itemAttrs" @click="handleClick">
    <slot />
  </component>
</template>
