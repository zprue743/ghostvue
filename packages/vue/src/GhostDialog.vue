<script setup lang="ts">
import { provide } from 'vue'

import { createDialogPartsContext } from './dialog-shared'
import { ghostDialogContextKey } from './ghost-dialog'
import { useGhostDialog } from './use-ghost-dialog'

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
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    modal: true,
  },
)

const emit = defineEmits<{
  /** Emitted when the open state transitions. */
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: { open: boolean; close: () => void }): unknown
}>()

const state = useGhostDialog({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  modal: () => props.modal,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

// Part registration, custom-id tracking, and the non-modal `openedAtMount`
// rule live in the internal dialog-shared module (also used by GhostDrawer).
const context = createDialogPartsContext(state)
provide(ghostDialogContextKey, context)
const { isOpen, close } = state
</script>

<template>
  <slot :open="isOpen" :close="close" />
</template>
