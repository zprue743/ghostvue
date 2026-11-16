<script setup lang="ts">
import { computed, onUnmounted, provide, shallowRef, watchEffect } from 'vue'

import { ghostHoverCardContextKey } from './ghost-hover-card'
import { useGhostHoverCard } from './use-ghost-hover-card'

// Explicit `open: undefined` prevents Vue from coercing an omitted boolean prop
// to `false`, preserving uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    /** Controlled open state. Omit for uncontrolled mode. */
    open?: boolean | undefined
    /** Initial open state when `open` is omitted. */
    defaultOpen?: boolean
    /** Milliseconds before showing after hover or focus begins. */
    openDelay?: number
    /** Milliseconds before hiding after hover/focus leaves the trigger and content. */
    closeDelay?: number
    /** When `true`, `Escape` dismisses the open card via `useDismissableLayer`. */
    closeOnEscape?: boolean
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    openDelay: 700,
    closeDelay: 300,
    closeOnEscape: true,
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
  open,
  close,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
} = useGhostHoverCard({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  onOpenChange: (next) => {
    emit('update:open', next)
  },
})

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const triggerPointer = shallowRef(false)
const triggerFocus = shallowRef(false)
const contentPointer = shallowRef(false)
const contentFocus = shallowRef(false)

function clearOpenTimer(): void {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
}

function clearCloseTimer(): void {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function shouldRemainOpen(): boolean {
  return (
    triggerPointer.value ||
    triggerFocus.value ||
    contentPointer.value ||
    contentFocus.value
  )
}

function scheduleOpen(): void {
  clearCloseTimer()
  if (isOpen.value) {
    return
  }
  clearOpenTimer()
  openTimer = setTimeout(() => {
    openTimer = null
    if (shouldRemainOpen()) {
      open()
    }
  }, props.openDelay)
}

function cancelClose(): void {
  clearCloseTimer()
}

function maybeScheduleClose(): void {
  if (shouldRemainOpen()) {
    return
  }
  clearOpenTimer()
  if (!isOpen.value) {
    return
  }
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    closeTimer = null
    if (!shouldRemainOpen()) {
      close()
    }
  }, props.closeDelay)
}

function hideImmediate(): void {
  clearOpenTimer()
  clearCloseTimer()
  if (isOpen.value) {
    close()
  }
}

function notifyTriggerPointerEnter(): void {
  triggerPointer.value = true
  scheduleOpen()
}

function notifyTriggerPointerLeave(): void {
  triggerPointer.value = false
  maybeScheduleClose()
}

function notifyTriggerFocusIn(): void {
  triggerFocus.value = true
  scheduleOpen()
}

function notifyTriggerFocusOut(relatedTarget: EventTarget | null): void {
  if (
    relatedTarget instanceof Node &&
    triggerElement.value?.contains(relatedTarget)
  ) {
    return
  }
  triggerFocus.value = false
  if (
    relatedTarget instanceof Node &&
    contentElement.value?.contains(relatedTarget)
  ) {
    cancelClose()
    return
  }
  maybeScheduleClose()
}

function notifyContentPointerEnter(): void {
  contentPointer.value = true
  cancelClose()
}

function notifyContentPointerLeave(): void {
  contentPointer.value = false
  maybeScheduleClose()
}

function notifyContentFocusIn(): void {
  contentFocus.value = true
  cancelClose()
}

function notifyContentFocusOut(relatedTarget: EventTarget | null): void {
  if (
    relatedTarget instanceof Node &&
    contentElement.value?.contains(relatedTarget)
  ) {
    return
  }
  contentFocus.value = false
  if (
    relatedTarget instanceof Node &&
    triggerElement.value?.contains(relatedTarget)
  ) {
    cancelClose()
    return
  }
  maybeScheduleClose()
}

watchEffect(() => {
  if (!isOpen.value) {
    contentPointer.value = false
    contentFocus.value = false
  }
})

onUnmounted(() => {
  clearOpenTimer()
  clearCloseTimer()
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)
const triggerElement = shallowRef<HTMLElement | null>(null)
const contentElement = shallowRef<HTMLElement | null>(null)

provide(ghostHoverCardContextKey, {
  isOpen,
  closeDelay: computed(() => props.closeDelay),
  closeOnEscape: computed(() => props.closeOnEscape),
  cancelClose,
  hideImmediate,
  notifyTriggerPointerEnter,
  notifyTriggerPointerLeave,
  notifyTriggerFocusIn,
  notifyTriggerFocusOut,
  notifyContentPointerEnter,
  notifyContentPointerLeave,
  notifyContentFocusIn,
  notifyContentFocusOut,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerRegistered,
  triggerElement,
  contentElement,
  setTriggerElement(element) {
    triggerElement.value = element
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
})
</script>

<template>
  <slot :open="isOpen" :close="close" />
</template>
