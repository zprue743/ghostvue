<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import {
  createDialogPartExposed,
  resolveDialogHtmlElement,
} from './dialog-shared'
import type {
  GhostCommandPaletteEmptyElement,
  GhostCommandPaletteEmptyExposed,
} from './ghost-command-palette'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the empty message. */
    as?: GhostCommandPaletteEmptyElement
  }>(),
  {
    as: 'div',
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteEmpty')
const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const visible = computed(
  () =>
    context.isOpen.value &&
    !context.loading.value &&
    context.itemCount.value === 0,
)

const emptyAttrs = computed(() => ({
  ...attrs,
  'data-part': 'empty',
  class: ['ghost-command-palette-empty', attrs.class],
}))

defineExpose<GhostCommandPaletteEmptyExposed>(
  createDialogPartExposed(() => resolveDialogHtmlElement(hostRef.value)),
)
</script>

<!--
  No role: the message is not an option, and the list drops its listbox role
  while empty, so it reads as plain text. The polite live region in the
  content already announces `messages.empty`.
-->
<template>
  <component :is="as" v-show="visible" ref="host" v-bind="emptyAttrs">
    <slot />
  </component>
</template>
