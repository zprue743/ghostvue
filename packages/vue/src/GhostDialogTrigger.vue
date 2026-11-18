<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogTriggerPart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogTriggerElement,
  type GhostDialogTriggerExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the trigger control. */
    as?: GhostDialogTriggerElement
    /** Disables opening or toggling on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogTrigger',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

const { triggerAttrs, onClick, onKeydown, exposed } = useDialogTriggerPart(
  context,
  props,
  hostRef,
)

defineExpose<GhostDialogTriggerExposed>(exposed)
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="triggerAttrs"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot />
  </component>
</template>
