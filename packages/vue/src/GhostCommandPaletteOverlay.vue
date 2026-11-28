<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { useDialogOverlayPart } from './dialog-shared'
import type {
  GhostCommandPaletteOverlayElement,
  GhostCommandPaletteOverlayExposed,
} from './ghost-command-palette'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the modal backdrop. */
    as?: GhostCommandPaletteOverlayElement
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

const context = injectCommandPaletteContext('GhostCommandPaletteOverlay')
const hostRef = useTemplateRef('host')

// Rendered only while open and modal, exactly like GhostDialogOverlay.
const { attrs, isPresent, overlayAttrs, exposed } = useDialogOverlayPart(
  context.dialog,
  hostRef,
)

defineExpose<GhostCommandPaletteOverlayExposed>(exposed)
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="isPresent"
      ref="host"
      :class="['ghost-command-palette-overlay', attrs['class']]"
      v-bind="overlayAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
