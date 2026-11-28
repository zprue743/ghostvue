<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { injectCommandPaletteContext } from './command-palette-context'
import { useDialogContentPart } from './dialog-shared'
import type {
  GhostCommandPaletteContentElement,
  GhostCommandPaletteContentExposed,
} from './ghost-command-palette'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog surface. */
    as?: GhostCommandPaletteContentElement
    /** Overrides the root `closeOnEscape` when set. */
    closeOnEscape?: boolean | undefined
    /** Dismisses the palette on outside pointerdown, including the overlay. */
    closeOnOutsideClick?: boolean
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
    /** Gates the first focus-scope activation of each opening. */
    focusReady?: boolean
    /** Resolves the element focused on open; defaults to the command input. */
    initialFocus?: (() => HTMLElement | null) | undefined
    /** Resolves the element focused on close; invalid or `null` keeps the saved opener. */
    returnFocus?: (() => HTMLElement | null) | undefined
  }>(),
  {
    as: 'div',
    closeOnEscape: undefined,
    closeOnOutsideClick: true,
    portal: true,
    portalTo: 'body',
    focusReady: true,
    initialFocus: undefined,
    returnFocus: undefined,
  },
)

const context = injectCommandPaletteContext('GhostCommandPaletteContent')
const hostRef = useTemplateRef('host')

function resolveInput(): HTMLElement | null {
  return context.inputElement.value
}

// Getter view over the props so the shared dialog mechanics read the
// palette's defaults lazily: `role` is always `dialog`, `Escape` falls back to
// the root, and initial focus lands on the command input.
const partProps = {
  role: 'dialog' as const,
  get closeOnEscape() {
    return props.closeOnEscape ?? context.closeOnEscape.value
  },
  get closeOnOutsideClick() {
    return props.closeOnOutsideClick
  },
  get portal() {
    return props.portal
  },
  get portalTo() {
    return props.portalTo
  },
  get focusReady() {
    return props.focusReady
  },
  get initialFocus() {
    return props.initialFocus ?? resolveInput
  },
  get returnFocus() {
    return props.returnFocus
  },
}

// Focus scope, dismissable layer, scroll lock, inert isolation, title
// linking, and GHOST002 come from the shared dialog part mechanics.
const { attrs, isPresent, contentAttrs, exposed } = useDialogContentPart(
  context.dialog,
  partProps,
  hostRef,
  {
    suppressRestoreFocus: () => context.focusRestoreSuppressed.value,
  },
)

const { liveRegionProps, announceMessage } = context

defineExpose<GhostCommandPaletteContentExposed>(exposed)
</script>

<!--
  The polite live region sits inside the surface: a modal palette inerts its
  background, and inert content is hidden from assistive technology, so a
  region rendered next to the root would never be announced.
-->
<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="isPresent"
      ref="host"
      :class="['ghost-command-palette-content', attrs['class']]"
      v-bind="contentAttrs"
      @focusout="context.notifyFocusOut"
    >
      <slot />
      <div v-bind="liveRegionProps">{{ announceMessage }}</div>
    </component>
  </GhostPortal>
</template>
