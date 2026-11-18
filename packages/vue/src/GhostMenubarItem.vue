<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostMenubarMenuContextKey,
  resolveMenubarHtmlElement,
  type GhostMenubarItemElement,
  type GhostMenubarItemExposed,
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
  return {
    ...omitMenuItemClickAttr(attrs),
    role: 'menuitem',
    tabindex: -1,
    'aria-disabled': props.disabled ? 'true' : undefined,
    'data-part': 'item',
    'data-disabled': props.disabled ? '' : undefined,
  }
})

function handleClick(event: MouseEvent): void {
  if (!runMenuItemConsumerClick(event, props.disabled, attrs)) {
    return
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
