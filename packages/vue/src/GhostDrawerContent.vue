<script setup lang="ts">
import {
  computed,
  nextTick,
  onUnmounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'

import { injectDialogPartsContext, useDialogContentPart } from './dialog-shared'
import {
  ghostDrawerContextKey,
  resolveDrawerDir,
  type GhostDrawerContentElement,
  type GhostDrawerContentExposed,
  type GhostDrawerContentRole,
  type GhostDrawerDirection,
  type GhostDrawerSide,
} from './ghost-drawer'
import type { GhostPortalTarget } from './ghost-portal'
import GhostPortal from './GhostPortal.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the drawer surface. */
    as?: GhostDrawerContentElement
    /** Overrides the root `side` when provided. */
    side?: GhostDrawerSide | undefined
    /** Overrides the root `dir` when provided. */
    dir?: GhostDrawerDirection | undefined
    /** Semantic ARIA role for the drawer surface (`'dialog'` or `'alertdialog'`). */
    role?: GhostDrawerContentRole
    /** Dismisses the topmost open layer on `Escape`. */
    closeOnEscape?: boolean
    /** Dismisses the drawer on outside pointerdown (`true` for `'dialog'`, `false` for `'alertdialog'` by default). */
    closeOnOutsideClick?: boolean | undefined
    /** Teleport content through `GhostPortal` when `true`, or render inline when `false`. */
    portal?: boolean
    /** Teleport target passed to `GhostPortal` when `portal` is `true`. */
    portalTo?: GhostPortalTarget
  }>(),
  {
    as: 'div',
    side: undefined,
    dir: undefined,
    role: 'dialog',
    closeOnEscape: true,
    closeOnOutsideClick: undefined,
    portal: true,
    portalTo: 'body',
  },
)

const context = injectDialogPartsContext(
  ghostDrawerContextKey,
  'GhostDrawerContent',
  'GhostDrawer',
)
const hostRef = useTemplateRef('host')

watch(
  () => props.side,
  (side) => {
    context.setContentSide(side ?? null)
  },
  { immediate: true },
)

const explicitDir = computed(() => props.dir ?? context.dir.value)

// Server render and the first client render agree on `explicitDir ?? 'ltr'`
// (no DOM reads during setup), so hydration never mismatches. The DOM-based
// resolution below runs after mount and only refines the value.
const resolvedDir = shallowRef<GhostDrawerDirection>(explicitDir.value ?? 'ltr')

// Focus scope, dismissable layer, scroll lock, inert isolation, ARIA linking,
// and GHOST002/GHOST003 diagnostics are shared with GhostDialogContent.
const { attrs, presentElement, isPresent, contentAttrs, exposed } =
  useDialogContentPart(context, props, hostRef, {
    extraAttrs: () => {
      const hooks: Record<string, unknown> = {
        'data-side': context.side.value,
        'data-dir': resolvedDir.value,
      }
      // A portaled `position: fixed` surface inherits direction from <body>,
      // not from the subtree around the trigger. Mirror the resolved direction
      // onto the host so interior flow matches the edge it is anchored to.
      // `dir="ltr"` is only written when requested explicitly so ordinary LTR
      // drawers keep inheriting from the document.
      if (resolvedDir.value === 'rtl' || explicitDir.value !== undefined) {
        hooks['dir'] = resolvedDir.value
      }
      return hooks
    },
  })

let active = true
onUnmounted(() => {
  active = false
  context.setContentSide(null)
})

// Resolve against the mounted surface (live through the exit) so the exit
// slide never flips edge when the open-gated element clears at close.
function refreshDir(): void {
  resolvedDir.value = resolveDrawerDir({
    dir: explicitDir.value,
    contentElement: presentElement.value,
    triggerElement: context.triggerElement.value,
  })
}

watch(
  [
    explicitDir,
    presentElement,
    () => context.triggerElement.value,
    () => props.portal,
    () => props.portalTo,
  ],
  () => {
    refreshDir()
    // GhostPortal may move an open-at-mount surface on the next tick; resolve
    // again from its final location.
    void nextTick(() => {
      if (active) {
        refreshDir()
      }
    })
  },
  { immediate: true, flush: 'post' },
)

defineExpose<GhostDrawerContentExposed>(exposed)
</script>

<template>
  <GhostPortal :to="portalTo" :disabled="!portal">
    <component
      :is="as"
      v-if="isPresent"
      ref="host"
      :class="['ghost-drawer-content', attrs['class']]"
      v-bind="contentAttrs"
    >
      <slot />
    </component>
  </GhostPortal>
</template>
