<script setup lang="ts">
import { computed, provide, shallowRef } from 'vue'

import { ghostContextMenuContextKey } from './ghost-context-menu'
import { useGhostContextMenu } from './use-ghost-context-menu'

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
  openAtPointer,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
  virtualReference,
} = useGhostContextMenu({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerElement = shallowRef<HTMLElement | null>(null)

provide(ghostContextMenuContextKey, {
  isOpen,
  open: openMenu,
  close,
  openAtPointer,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerElement,
  virtualReference,
  setTriggerElement(element) {
    triggerElement.value = element
  },
  setTriggerId(id) {
    customTriggerId.value = id
  },
  setContentId(id) {
    customContentId.value = id
  },
})
</script>

<template>
  <slot :open="isOpen" :close="close" />
</template>
