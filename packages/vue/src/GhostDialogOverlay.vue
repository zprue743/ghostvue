<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogOverlayPart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogOverlayElement,
  type GhostDialogOverlayExposed,
} from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the modal backdrop. */
    as?: GhostDialogOverlayElement
    /** Teleport overlay through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    portal: true,
    portalTo: 'body',
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogOverlay',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

const { attrs, visible, overlayAttrs, exposed } = useDialogOverlayPart(
  context,
  hostRef,
)

defineExpose<GhostDialogOverlayExposed>(exposed)
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="visible"
      ref="host"
      :class="['ghost-dialog-overlay', attrs['class']]"
      v-bind="overlayAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
