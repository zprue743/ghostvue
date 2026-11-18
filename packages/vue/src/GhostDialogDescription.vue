<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogLabelPart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogDescriptionElement,
  type GhostDialogDescriptionExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog description. */
    as?: GhostDialogDescriptionElement
  }>(),
  {
    as: 'p',
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogDescription',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

const { labelAttrs, exposed } = useDialogLabelPart(
  context,
  'description',
  hostRef,
)

defineExpose<GhostDialogDescriptionExposed>(exposed)
</script>

<template>
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
  </component>
</template>
