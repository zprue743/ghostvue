<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostDropdownMenuContextKey,
  ghostDropdownMenuRadioGroupContextKey,
  resolveDropdownMenuHtmlElement,
  type GhostDropdownMenuRadioItemElement,
  type GhostDropdownMenuRadioItemExposed,
} from './ghost-dropdown-menu'
import {
  omitMenuItemClickAttr,
  runMenuItemConsumerClick,
} from './menu-item-activation'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostDropdownMenuRadioItemElement
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

const menuContext = inject(ghostDropdownMenuContextKey)
const radioGroup = inject(ghostDropdownMenuRadioGroupContextKey)
if (!menuContext) {
  throw new Error(
    'GhostDropdownMenuRadioItem must be used inside GhostDropdownMenu',
  )
}
if (!radioGroup) {
  throw new Error(
    'GhostDropdownMenuRadioItem must be used inside GhostDropdownMenuRadioGroup',
  )
}
const menu = menuContext
const group = radioGroup

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDropdownMenuHtmlElement(hostRef.value))

const isDisabled = computed(() => group.disabled.value || props.disabled)
const checked = computed(() => group.isSelected(props.value))

const itemAttrs = computed(() => {
  return {
    ...omitMenuItemClickAttr(attrs),
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
  if (!runMenuItemConsumerClick(event, isDisabled.value, attrs)) {
    return
  }
  group.select(props.value)
  emit('select', props.value, event)
  if (event.defaultPrevented) {
    return
  }
  menu.close()
}

defineExpose<GhostDropdownMenuRadioItemExposed>({
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
