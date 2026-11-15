<script setup lang="ts">
import { computed, provide, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbElement,
  type GhostBreadcrumbExposed,
} from './ghost-breadcrumb'
import { useGhostBreadcrumb } from './use-ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the navigation landmark. */
    as?: GhostBreadcrumbElement
    /** Accessible name for the breadcrumb navigation. */
    ariaLabel?: string
  }>(),
  {
    as: 'nav',
    ariaLabel: 'Breadcrumb',
  },
)

const { rootProps } = useGhostBreadcrumb({
  ariaLabel: () => props.ariaLabel,
})

provide(ghostBreadcrumbContextKey, { present: true })

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

defineExpose<GhostBreadcrumbExposed>({
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
  <component :is="as" ref="host" v-bind="{ ...rootProps, ...$attrs }">
    <slot />
  </component>
</template>
