<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogClosePart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerCloseElement,
  type GhostDrawerCloseExposed,
} from './ghost-drawer'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the close control. */
    as?: GhostDrawerCloseElement
    /** Disables closing on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = injectDialogPartsContext(
  ghostDrawerContextKey,
  'GhostDrawerClose',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

const { closeAttrs, onClick, onKeydown, exposed } = useDialogClosePart(
  context,
  props,
  hostRef,
)

defineExpose<GhostDrawerCloseExposed>(exposed)
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
