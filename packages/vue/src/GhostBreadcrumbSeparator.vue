<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbSeparatorElement,
  type GhostBreadcrumbSeparatorExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the decorative separator. */
    as?: GhostBreadcrumbSeparatorElement
  }>(),
  {
    as: 'span',
  },
)

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error(
    'GhostBreadcrumbSeparator must be used inside GhostBreadcrumb',
  )
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const separatorAttrs = computed(() => ({
  class: 'ghost-breadcrumb-separator',
  'data-part': 'separator',
  'aria-hidden': 'true' as const,
}))

defineExpose<GhostBreadcrumbSeparatorExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="{ ...separatorAttrs, ...$attrs }">
    <slot>/</slot>
  </component>
</template>
