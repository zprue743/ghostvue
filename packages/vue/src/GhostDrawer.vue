<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue'

import { createDialogPartsContext } from './dialog-shared'
import {
  ghostDrawerContextKey,
  type GhostDrawerDirection,
  type GhostDrawerSide,
} from './ghost-drawer'
import { useGhostDrawer } from './use-ghost-drawer'

// Explicit `open: undefined` prevents Vue from coercing an omitted boolean prop
// to `false`, preserving uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    /** Controlled open state. Omit for uncontrolled mode. */
    open?: boolean | undefined
    /** Initial open state when `open` is omitted. */
    defaultOpen?: boolean
    /** Enables modal behavior (trapped focus, scroll lock, inert background, overlay). */
    modal?: boolean
    /** Viewport edge the drawer is anchored to (`'start'`, `'end'`, `'top'`, `'bottom'`). */
    side?: GhostDrawerSide
    /** Explicit writing direction for mapping logical `start` / `end` sides. */
    dir?: GhostDrawerDirection | undefined
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    modal: true,
    side: 'end',
    dir: undefined,
  },
)

const emit = defineEmits<{
  /** Emitted when the open state transitions. */
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: {
    open: boolean
    close: () => void
    side: GhostDrawerSide
  }): unknown
}>()

const state = useGhostDrawer({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  modal: () => props.modal,
  side: () => props.side,
  dir: () => props.dir,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

// GhostDrawerContent may override `side`; trigger, overlay, and the slot all
// report the effective side so styling hooks stay consistent across parts.
const contentSide = shallowRef<GhostDrawerSide | null>(null)
const effectiveSide = computed(() => contentSide.value ?? state.side.value)

provide(ghostDrawerContextKey, {
  ...createDialogPartsContext(state),
  side: effectiveSide,
  dir: state.dir,
  setContentSide(next) {
    contentSide.value = next
  },
})

const { isOpen, close } = state
</script>

<template>
  <slot :open="isOpen" :close="close" :side="effectiveSide" />
</template>
