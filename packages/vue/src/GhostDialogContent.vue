<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectDialogPartsContext, useDialogContentPart } from './dialog-shared'
import {
  ghostDialogContextKey,
  type GhostDialogContentElement,
  type GhostDialogContentExposed,
  type GhostDialogContentRole,
} from './ghost-dialog'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog surface. */
    as?: GhostDialogContentElement
    /** Semantic ARIA role for the dialog surface (`'dialog'` or `'alertdialog'`). */
    role?: GhostDialogContentRole
    /** Dismisses the topmost open dialog on `Escape`. */
    closeOnEscape?: boolean
    /** Dismisses the dialog on outside pointerdown (`true` for `'dialog'`, `false` for `'alertdialog'` by default). */
    closeOnOutsideClick?: boolean | undefined
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
    /** Gates the first focus-scope activation of each opening; once active, the scope stays active until close. */
    focusReady?: boolean
    /** Resolves the preferred initial focus target; invalid or `null` keeps the default autofocus fallback. */
    initialFocus?: (() => HTMLElement | null) | undefined
    /** Resolves the preferred close focus target; invalid or `null` keeps the saved opener. */
    returnFocus?: (() => HTMLElement | null) | undefined
  }>(),
  {
    as: 'div',
    role: 'dialog',
    closeOnEscape: true,
    closeOnOutsideClick: undefined,
    portal: true,
    portalTo: 'body',
    focusReady: true,
    initialFocus: undefined,
    returnFocus: undefined,
  },
)

const context = injectDialogPartsContext(
  ghostDialogContextKey,
  'GhostDialogContent',
  'GhostDialog',
)
const hostRef = useTemplateRef('host')

// Focus scope, dismissable layer, scroll lock, inert isolation, ARIA linking,
// and GHOST002/GHOST003 diagnostics are shared with GhostDrawerContent.
const { attrs, isPresent, contentAttrs, exposed } = useDialogContentPart(
  context,
  props,
  hostRef,
)

defineExpose<GhostDialogContentExposed>(exposed)
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="isPresent"
      ref="host"
      :class="['ghost-dialog-content', attrs['class']]"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
