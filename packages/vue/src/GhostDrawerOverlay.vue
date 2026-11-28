<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogOverlayPart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerOverlayElement,
  type GhostDrawerOverlayExposed,
} from './ghost-drawer'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the modal backdrop. */
    as?: GhostDrawerOverlayElement
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
  ghostDrawerContextKey,
  'GhostDrawerOverlay',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

const { attrs, isPresent, overlayAttrs, exposed } = useDialogOverlayPart(
  context,
  hostRef,
  { extraAttrs: () => ({ 'data-side': context.side.value }) },
)

defineExpose<GhostDrawerOverlayExposed>(exposed)
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="isPresent"
      ref="host"
      :class="['ghost-drawer-overlay', attrs['class']]"
      v-bind="overlayAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
