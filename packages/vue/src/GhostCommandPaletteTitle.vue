<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { useDialogLabelPart } from './dialog-shared'
import type {
  GhostCommandPaletteTitleElement,
  GhostCommandPaletteTitleExposed,
} from './ghost-command-palette'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the palette heading. */
    as?: GhostCommandPaletteTitleElement
  }>(),
  {
    as: 'h2',
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteTitle')
const attrs = useAttrs()
const hostRef = useTemplateRef('host')

// Registers the title id so the content is labelled by it (C2). There is no
// hidden default title: a palette without a Title or aria-label on the
// content logs GHOST002 in development.
const { labelAttrs, exposed } = useDialogLabelPart(
  context.dialog,
  'title',
  hostRef,
)

const titleAttrs = computed(() => ({
  ...labelAttrs.value,
  class: ['ghost-command-palette-title', attrs.class],
}))

defineExpose<GhostCommandPaletteTitleExposed>(exposed)
</script>

<template>
  <component :is="as" ref="host" v-bind="titleAttrs">
    <slot />
  </component>
</template>
