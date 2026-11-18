<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostMenubarMenuContextKey,
  ghostMenubarMenuRadioGroupContextKey,
  resolveMenubarHtmlElement,
  type GhostMenubarRadioItemElement,
  type GhostMenubarRadioItemExposed,
} from './ghost-menubar'
import {
  omitMenuItemClickAttr,
  runMenuItemConsumerClick,
} from './menu-item-activation'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostMenubarRadioItemElement
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

const menuContext = inject(ghostMenubarMenuContextKey)
const radioGroup = inject(ghostMenubarMenuRadioGroupContextKey)
if (!menuContext) {
  throw new Error('GhostMenubarRadioItem must be used inside GhostMenubarMenu')
}
if (!radioGroup) {
  throw new Error(
    'GhostMenubarRadioItem must be used inside GhostMenubarRadioGroup',
  )
}
const menu = menuContext
const group = radioGroup

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveMenubarHtmlElement(hostRef.value))

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

defineExpose<GhostMenubarRadioItemExposed>({
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
