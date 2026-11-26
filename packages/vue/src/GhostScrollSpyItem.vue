<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostScrollSpyContextKey,
  resolveScrollSpyHtmlElement,
  type GhostScrollSpyItemElement,
  type GhostScrollSpyItemExposed,
} from './ghost-scroll-spy'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostScrollSpyItemElement
    target?: string
  }>(),
  {
    as: 'li',
    target: '',
  },
)

const context = inject(ghostScrollSpyContextKey)
if (!context) {
  throw new Error('GhostScrollSpyItem must be used inside GhostScrollSpy')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveScrollSpyHtmlElement(hostRef.value))

const active = computed(() =>
  props.target.length > 0 ? context.isActive(props.target) : false,
)

const itemAttrs = computed(() => ({
  class: 'ghost-scroll-spy-item',
  'data-part': 'item',
  ...(active.value ? { 'data-state': 'active' as const } : {}),
}))

defineExpose<GhostScrollSpyItemExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component
    :is="props.as"
    ref="host"
    v-bind="{ ...itemAttrs, ...$attrs, class: [itemAttrs.class, $attrs.class] }"
  >
    <slot />
  </component>
</template>
