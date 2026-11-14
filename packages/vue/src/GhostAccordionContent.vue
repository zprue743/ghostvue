<script setup lang="ts">
import { inject, useTemplateRef } from 'vue'

import {
  ghostAccordionItemContextKey,
  type GhostAccordionContentElement,
  type GhostAccordionContentExposed,
} from './ghost-accordion'
import GhostCollapsibleContent from './GhostCollapsibleContent.vue'
import type { GhostCollapsibleContentExposed } from './ghost-collapsible'

defineOptions({
  inheritAttrs: false,
})

const itemContext = inject(ghostAccordionItemContextKey)
if (!itemContext) {
  throw new Error(
    'GhostAccordionContent must be used inside GhostAccordionItem',
  )
}
void itemContext

withDefaults(
  defineProps<{
    /** Tag name or component forwarded to the inner disclosure panel. */
    as?: GhostAccordionContentElement
    /** Skips theme height animations even when motion is allowed. */
    disableAnimation?: boolean
  }>(),
  {
    as: 'div',
    disableAnimation: false,
  },
)

const innerRef = useTemplateRef<GhostCollapsibleContentExposed>('inner')

defineExpose<GhostAccordionContentExposed>({
  get element() {
    return innerRef.value?.element ?? null
  },
  focus(options?: FocusOptions) {
    innerRef.value?.focus(options)
  },
  blur() {
    innerRef.value?.blur()
  },
})
</script>

<template>
  <GhostCollapsibleContent
    ref="inner"
    v-bind="$attrs"
    :as="as"
    :disable-animation="disableAnimation"
  >
    <slot />
  </GhostCollapsibleContent>
</template>
