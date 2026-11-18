<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogTriggerPart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerTriggerElement,
  type GhostDrawerTriggerExposed,
} from './ghost-drawer'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the trigger control. */
    as?: GhostDrawerTriggerElement
    /** Disables opening or toggling on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = injectDialogPartsContext(
  ghostDrawerContextKey,
  'GhostDrawerTrigger',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

const { triggerAttrs, onClick, onKeydown, exposed } = useDialogTriggerPart(
  context,
  props,
  hostRef,
  // `aria-haspopup="dialog"` stays: a drawer is an APG dialog.
  { extraAttrs: () => ({ 'data-side': context.side.value }) },
)

defineExpose<GhostDrawerTriggerExposed>(exposed)
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
