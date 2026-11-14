<script setup lang="ts">
import { computed, provide, shallowRef, watch } from 'vue'

import { ghostDropdownMenuContextKey } from './ghost-dropdown-menu'
import { useGhostDropdownMenu } from './use-ghost-dropdown-menu'

const props = withDefaults(
  defineProps<{
    open?: boolean | undefined
    defaultOpen?: boolean
  }>(),
  {
    open: undefined,
    defaultOpen: false,
  },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: { open: boolean; close: () => void }): unknown
}>()

const {
  isOpen,
  open: openMenu,
  close,
  toggle,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
} = useGhostDropdownMenu({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

const openedAtMount = shallowRef(isOpen.value)
watch(isOpen, (open) => {
  if (!open) {
    openedAtMount.value = false
    focusLastOnOpen.value = false
  }
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)
const triggerElement = shallowRef<HTMLElement | null>(null)
const focusLastOnOpen = shallowRef(false)

provide(ghostDropdownMenuContextKey, {
  isOpen,
  open: openMenu,
  close,
  toggle,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerRegistered,
  triggerElement,
  focusLastOnOpen,
  setFocusLastOnOpen(value) {
    focusLastOnOpen.value = value
  },
  setTriggerElement(element) {
    triggerElement.value = element
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
  openedAtMount,
})
</script>

<template>
  <slot :open="isOpen" :close="close" />
</template>