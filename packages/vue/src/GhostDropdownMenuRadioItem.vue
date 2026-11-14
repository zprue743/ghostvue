<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostDropdownMenuContextKey,
  ghostDropdownMenuRadioGroupContextKey,
  resolveDropdownMenuHtmlElement,
  type GhostDropdownMenuRadioItemElement,
  type GhostDropdownMenuRadioItemExposed,
} from './ghost-dropdown-menu'

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
  select: [value: string]
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

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDropdownMenuHtmlElement(hostRef.value))

const isDisabled = computed(
  () => radioGroup.disabled.value || props.disabled,
)
const checked = computed(() => radioGroup.isSelected(props.value))

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
  if (isDisabled.value || event.defaultPrevented) {
    if (isDisabled.value) {
      event.preventDefault()
    }
    return
  }
  radioGroup!.select(props.value)
  emit('select', props.value)
  menuContext!.close()
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