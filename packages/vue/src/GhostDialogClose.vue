<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogClosePart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogCloseElement,
  type GhostDialogCloseExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the close control. */
    as?: GhostDialogCloseElement
    /** Disables closing on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogClose',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

const { closeAttrs, onClick, onKeydown, exposed } = useDialogClosePart(
  context,
  props,
  hostRef,
)

defineExpose<GhostDialogCloseExposed>(exposed)
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="closeAttrs"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot />
  </component>
</template>
