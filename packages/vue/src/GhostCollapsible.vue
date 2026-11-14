<script setup lang="ts">
import { computed, provide, shallowRef, toRef } from 'vue'

import { ghostCollapsibleContextKey } from './ghost-collapsible'
import { useGhostCollapsible } from './use-ghost-collapsible'

// Explicit `open: undefined` prevents Vue from coercing an omitted boolean prop
// to `false`, preserving uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    /** Controlled open state. Omit for uncontrolled mode. */
    open?: boolean | undefined
    /** Initial open state when `open` is omitted. */
    defaultOpen?: boolean
    /** Disables toggling on the trigger when `true`. */
    disabled?: boolean
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** Emitted when the open state transitions. */
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: { open: boolean; toggle: () => void }): unknown
}>()

const {
  isOpen,
  open: openPanel,
  close,
  toggle,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
} = useGhostCollapsible({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)

provide(ghostCollapsibleContextKey, {
  isOpen,
  disabled: toRef(props, 'disabled'),
  open: openPanel,
  close,
  toggle,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerRegistered,
  setTriggerId(id) {
    customTriggerId.value = id
  },
  setTriggerRegistered(registered) {
    triggerRegistered.value = registered
  },
  setContentId(id) {
    customContentId.value = id
  },
})
</script>

<template>
  <slot :open="isOpen" :toggle="toggle" />
</template>
