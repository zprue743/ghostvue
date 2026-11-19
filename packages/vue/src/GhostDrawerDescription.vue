<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogLabelPart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerDescriptionElement,
  type GhostDrawerDescriptionExposed,
} from './ghost-drawer'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the drawer description. */
    as?: GhostDrawerDescriptionElement
  }>(),
  {
    as: 'p',
  },
)

const context = injectDialogPartsContext(
  ghostDrawerContextKey,
  'GhostDrawerDescription',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

const { labelAttrs, exposed } = useDialogLabelPart(
  context,
  'description',
  hostRef,
)

defineExpose<GhostDrawerDescriptionExposed>(exposed)
</script>

<template>
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
  </component>
</template>
