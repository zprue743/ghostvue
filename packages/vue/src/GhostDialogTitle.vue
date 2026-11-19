<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogLabelPart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogTitleElement,
  type GhostDialogTitleExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog heading. */
    as?: GhostDialogTitleElement
  }>(),
  {
    as: 'h2',
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogTitle',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

const { labelAttrs, exposed } = useDialogLabelPart(context, 'title', hostRef)

defineExpose<GhostDialogTitleExposed>(exposed)
</script>

<template>
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
  </component>
</template>
