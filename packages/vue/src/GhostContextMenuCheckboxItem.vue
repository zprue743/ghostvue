<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef, type PropType } from 'vue'

import {
  ghostContextMenuContextKey,
  resolveContextMenuHtmlElement,
  type GhostContextMenuCheckboxItemElement,
  type GhostContextMenuCheckboxItemExposed,
} from './ghost-context-menu'
import { useControllableState } from './use-controllable-state'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  as: {
    type: String as PropType<GhostContextMenuCheckboxItemElement>,
    default: 'div',
  },
  checked: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  defaultChecked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  'update:checked': [checked: boolean]
}>()

inject(ghostContextMenuContextKey, null)

const isChecked = useControllableState<boolean>({
  prop: () => props.checked,
  defaultValue: () => props.defaultChecked,
  onChange: (next) => {
    emit('update:checked', next)
  },
})

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveContextMenuHtmlElement(hostRef.value))

const itemAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'onClick') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    role: 'menuitemcheckbox',
    tabindex: -1,
    'aria-checked': isChecked.value ? 'true' : 'false',
    'aria-disabled': props.disabled ? 'true' : undefined,
    'data-part': 'checkbox-item',
    'data-state': isChecked.value ? 'checked' : 'unchecked',
    'data-disabled': props.disabled ? '' : undefined,
  }
})

function handleKeydown(event: KeyboardEvent): void {
  if (props.disabled || event.defaultPrevented) {
    return
  }
  if (event.key !== ' ' && event.key !== 'Enter') {
    return
  }
  event.preventDefault()
  handleClick(event as unknown as MouseEvent)
}

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
  if (props.disabled) {
    event.preventDefault()
    return
  }
  if (event.defaultPrevented) {
    return
  }
  isChecked.value = !isChecked.value
}

defineExpose<GhostContextMenuCheckboxItemExposed>({
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
