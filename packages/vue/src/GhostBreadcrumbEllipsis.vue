<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import GhostPopover from './GhostPopover.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbEllipsisExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Accessible name for the ellipsis disclosure trigger. */
    label?: string
  }>(),
  {
    label: 'Show more breadcrumb segments',
  },
)

defineSlots<{
  default(): unknown
  icon(): unknown
}>()

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbEllipsis must be used inside GhostBreadcrumb')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

// Themed wrappers mark the host with `data-themed`. The popover content is
// portaled to `body`, outside the trail and usually outside any `.ghost-theme`
// ancestor, so the marker is mirrored onto the trigger and the content.
// Without it no theme rule can reach the body-level panel, which then renders
// as transparent, unlayered text over the page (GHO-223).
const themedMarker = computed(() =>
  'data-themed' in attrs ? { 'data-themed': '' } : {},
)

const triggerAttrs = computed(() => ({
  'aria-label': props.label,
  class: 'ghost-breadcrumb-ellipsis',
  'data-part': 'ellipsis',
  ...themedMarker.value,
}))

defineExpose<GhostBreadcrumbEllipsisExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const button = element.value?.querySelector('button')
    button?.focus(options)
  },
  blur() {
    const button = element.value?.querySelector('button')
    button?.blur()
  },
})
</script>

<template>
  <!-- Consumer attrs (class, style, data-*) land on the host, which is also
       the exposed `element`; Vue merges class and style. -->
  <span
    ref="host"
    v-bind="$attrs"
    class="ghost-breadcrumb-ellipsis-host"
    data-part="ellipsis"
  >
    <GhostPopover>
      <GhostPopoverTrigger v-bind="triggerAttrs">
        <slot name="icon">…</slot>
      </GhostPopoverTrigger>
      <GhostPopoverContent
        class="ghost-breadcrumb-ellipsis-content"
        v-bind="themedMarker"
      >
        <slot />
      </GhostPopoverContent>
    </GhostPopover>
  </span>
</template>
