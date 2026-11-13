<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue'

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

const {
  isOpen,
  isModal,
  open: openDialog,
  close,
  toggle,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
  titleId: defaultTitleId,
  descriptionId: defaultDescriptionId,
} = useGhostDialog({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  modal: () => props.modal,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

// Record whether a non-modal dialog started open at setup so `defaultOpen`
// does not steal focus on page load (matching GhostPopover), while modal dialogs
// always move focus inside on open per APG Dialog expectations.
const openedAtMount = shallowRef(isOpen.value)
watch(isOpen, (open) => {
  if (!open) {
    openedAtMount.value = false
  }
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const customTitleId = shallowRef<string | null>(null)
const customDescriptionId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)
const titleRegistered = shallowRef(false)
const descriptionRegistered = shallowRef(false)
const triggerElement = shallowRef<HTMLElement | null>(null)
const overlayElement = shallowRef<HTMLElement | null>(null)
const contentElement = shallowRef<HTMLElement | null>(null)

provide(ghostDialogContextKey, {
  isOpen,
  isModal,
  open: openDialog,
  close,
  toggle,
  defaultTriggerId,
  defaultContentId,
  defaultTitleId,
  defaultDescriptionId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  titleId: computed(() => customTitleId.value ?? defaultTitleId.value),
  descriptionId: computed(
    () => customDescriptionId.value ?? defaultDescriptionId.value,
  ),
  triggerRegistered,
  titleRegistered,
  descriptionRegistered,
  triggerElement,
  overlayElement,
  contentElement,
  openedAtMount,
  setTriggerElement(element) {
    triggerElement.value = element
  },
  setOverlayElement(element) {
    overlayElement.value = element
  },
  setContentElement(element) {
    contentElement.value = element
  },
  setTriggerId(id) {
    customTriggerId.value = id
  },
  setTriggerRegistered(registered) {
    triggerRegistered.value = registered
  },
  setContentId(id) {
    customContentId.value = id
  },
  setTitleId(id) {
    customTitleId.value = id
  },
  setTitleRegistered(registered) {
    titleRegistered.value = registered
  },
  setDescriptionId(id) {
    customDescriptionId.value = id
  },
  setDescriptionRegistered(registered) {
    descriptionRegistered.value = registered
  },
})
</script>

<template>
  <slot :open="isOpen" :close="close" />
</template>
