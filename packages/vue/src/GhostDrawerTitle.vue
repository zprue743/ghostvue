<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogLabelPart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerTitleElement,
  type GhostDrawerTitleExposed,
} from './ghost-drawer'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the drawer heading. */
    as?: GhostDrawerTitleElement
  }>(),
  {
    as: 'h2',
  },
)

const context = injectDialogPartsContext(
  ghostDrawerContextKey,
  'GhostDrawerTitle',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

const { labelAttrs, exposed } = useDialogLabelPart(context, 'title', hostRef)

defineExpose<GhostDrawerTitleExposed>(exposed)
</script>

<template>
  <component :is="as" ref="host" v-bind="labelAttrs">
    <slot />
  </component>
</template>
