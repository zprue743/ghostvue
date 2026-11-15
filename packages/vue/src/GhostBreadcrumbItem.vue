<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbItemElement,
  type GhostBreadcrumbItemExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the list item. */
    as?: GhostBreadcrumbItemElement
  }>(),
  {
    as: 'li',
  },
)

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbItem must be used inside GhostBreadcrumb')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const itemAttrs = computed(() => ({
  class: 'ghost-breadcrumb-item',
  'data-part': 'item',
}))

defineExpose<GhostBreadcrumbItemExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="{ ...itemAttrs, ...$attrs }">
    <slot />
  </component>
</template>
