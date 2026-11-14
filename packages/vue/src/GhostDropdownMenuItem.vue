<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostDropdownMenuContextKey,
  resolveDropdownMenuHtmlElement,
  type GhostDropdownMenuItemElement,
  type GhostDropdownMenuItemExposed,
} from './ghost-dropdown-menu'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostDropdownMenuItemElement
    disabled?: boolean
  }>(),
  {
    as: 'div',
    disabled: false,
  },
)

const emit = defineEmits<{
  select: [event: Event]
}>()

const injected = inject(ghostDropdownMenuContextKey)
if (!injected) {
  throw new Error('GhostDropdownMenuItem must be used inside GhostDropdownMenu')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDropdownMenuHtmlElement(hostRef.value))

const itemAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'onClick') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    role: 'menuitem',
    tabindex: -1,
    'aria-disabled': props.disabled ? 'true' : undefined,
    'data-part': 'item',
    'data-disabled': props.disabled ? '' : undefined,
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
  if (props.disabled || event.defaultPrevented) {
    if (props.disabled) {
      event.preventDefault()
    }
    return
  }
  emit('select', event)
  context.close()
}

defineExpose<GhostDropdownMenuItemExposed>({
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
