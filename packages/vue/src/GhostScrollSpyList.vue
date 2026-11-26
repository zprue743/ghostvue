<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostScrollSpyContextKey,
  resolveScrollSpyHtmlElement,
  type GhostScrollSpyListElement,
  type GhostScrollSpyListExposed,
} from './ghost-scroll-spy'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostScrollSpyListElement
  }>(),
  {
    as: 'ol',
  },
)

const context = inject(ghostScrollSpyContextKey)
if (!context) {
  throw new Error('GhostScrollSpyList must be used inside GhostScrollSpy')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveScrollSpyHtmlElement(hostRef.value))

const listAttrs = computed(() => ({
  class: 'ghost-scroll-spy-list',
  'data-part': 'list',
}))

defineExpose<GhostScrollSpyListExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component
    :is="props.as"
    ref="host"
    v-bind="{ ...listAttrs, ...$attrs, class: [listAttrs.class, $attrs.class] }"
  >
    <slot />
  </component>
</template>
