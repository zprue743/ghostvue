<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbPageElement,
  type GhostBreadcrumbPageExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the current page segment. */
    as?: GhostBreadcrumbPageElement
  }>(),
  {
    as: 'span',
  },
)

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbPage must be used inside GhostBreadcrumb')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const pageAttrs = computed(() => ({
  class: 'ghost-breadcrumb-page',
  'data-part': 'page',
  'aria-current': 'page' as const,
}))

defineExpose<GhostBreadcrumbPageExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="{ ...pageAttrs, ...$attrs }">
    <slot />
  </component>
</template>
