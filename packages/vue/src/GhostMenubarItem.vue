<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostMenubarMenuContextKey,
  resolveMenubarHtmlElement,
  type GhostMenubarItemElement,
  type GhostMenubarItemExposed,
} from './ghost-menubar'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostMenubarItemElement
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

const injected = inject(ghostMenubarMenuContextKey)
if (!injected) {
  throw new Error('GhostMenubarItem must be used inside GhostMenubarMenu')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveMenubarHtmlElement(hostRef.value))

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
  if (props.disabled) {
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
  emit('select', event)
  if (event.defaultPrevented) {
    return
  }
  context.close()
}

defineExpose<GhostMenubarItemExposed>({
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
