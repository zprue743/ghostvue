<script setup lang="ts">
import { computed, provide, useTemplateRef, type Component } from 'vue'

import {
  ghostMenubarContextKey,
  resolveMenubarHtmlElement,
  type GhostMenubarExposed,
} from './ghost-menubar'
import { useGhostMenubar } from './use-ghost-menubar'

const props = withDefaults(
  defineProps<{
    as?: string | Component
    dir?: 'ltr' | 'rtl' | undefined
  }>(),
  {
    as: 'div',
    dir: undefined,
  },
)

const hostRef = useTemplateRef('host')
const element = computed(() => resolveMenubarHtmlElement(hostRef.value))
const menubarContext = useGhostMenubar(
  element,
  props.dir === 'ltr' || props.dir === 'rtl'
    ? {
        dir: () => (props.dir === 'rtl' ? 'rtl' : 'ltr'),
      }
    : undefined,
)
provide(ghostMenubarContextKey, menubarContext)

defineExpose<GhostMenubarExposed>({
  get element() {
    return resolveMenubarHtmlElement(hostRef.value)
  },
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    class="ghost-menubar"
    role="menubar"
    data-part="root"
    data-ghost-menubar
  >
    <slot />
  </component>
</template>
