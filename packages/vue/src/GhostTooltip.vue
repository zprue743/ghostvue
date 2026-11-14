<script setup lang="ts">
import { computed, onUnmounted, provide, shallowRef, watchEffect } from 'vue'

import { ghostTooltipContextKey } from './ghost-tooltip'
import { useGhostTooltip } from './use-ghost-tooltip'

const props = withDefaults(
  defineProps<{
    /** Controlled open state. Omit for uncontrolled mode. */
    open?: boolean | undefined
    /** Initial open state when `open` is omitted. */
    defaultOpen?: boolean
    /** Milliseconds before showing after hover or focus begins. */
    delayDuration?: number
    /** Milliseconds before hiding after hover/focus leaves the trigger and content. */
    closeDelay?: number
    /** When `true`, hides immediately on pointer/focus leave and disables content hover. */
    disableHoverableContent?: boolean
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    delayDuration: 700,
    closeDelay: 300,
    disableHoverableContent: false,
  },
)

const emit = defineEmits<{
  /** Emitted when the open state transitions. */
  'update:open': [open: boolean]
}>()

defineSlots<{
  default(props: { open: boolean }): unknown
}>()

const {
  isOpen,
  open,
  close,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
} = useGhostTooltip({
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
  return triggerPointer.value || triggerFocus.value || contentPointer.value
}

function scheduleShow(): void {
  clearCloseTimer()
  if (isOpen.value) {
    return
  }
  clearOpenTimer()
  openTimer = setTimeout(() => {
    openTimer = null
    open()
  }, props.delayDuration)
}

function cancelClose(): void {
  clearCloseTimer()
}

function maybeScheduleClose(): void {
  if (!isOpen.value || shouldRemainOpen()) {
    return
  }
  clearCloseTimer()
  const delay = props.disableHoverableContent ? 0 : props.closeDelay
  closeTimer = setTimeout(() => {
    closeTimer = null
    if (!shouldRemainOpen()) {
      close()
    }
  }, delay)
}

function hideImmediate(): void {
  clearOpenTimer()
  clearCloseTimer()
  close()
}

function notifyTriggerPointerEnter(): void {
  triggerPointer.value = true
  scheduleShow()
}

function notifyTriggerPointerLeave(): void {
  triggerPointer.value = false
  maybeScheduleClose()
}

function notifyTriggerFocusIn(): void {
  triggerFocus.value = true
  scheduleShow()
}

function notifyTriggerFocusOut(): void {
  triggerFocus.value = false
  maybeScheduleClose()
}

function notifyContentPointerEnter(): void {
  if (props.disableHoverableContent) {
    return
  }
  contentPointer.value = true
  cancelClose()
}

function notifyContentPointerLeave(): void {
  contentPointer.value = false
  maybeScheduleClose()
}

watchEffect((onCleanup) => {
  if (!isOpen.value || typeof document === 'undefined') {
    return
  }
  function onKeyDown(event: KeyboardEvent): void {
    if (
      event.key === 'Escape' &&
      !event.defaultPrevented &&
      !event.isComposing
    ) {
      hideImmediate()
    }
  }
  document.addEventListener('keydown', onKeyDown)
  onCleanup(() => {
    document.removeEventListener('keydown', onKeyDown)
  })
})

watchEffect(() => {
  if (!isOpen.value) {
    contentPointer.value = false
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

provide(ghostTooltipContextKey, {
  isOpen,
  delayDuration: computed(() => props.delayDuration),
  closeDelay: computed(() => props.closeDelay),
  disableHoverableContent: computed(() => props.disableHoverableContent),
  scheduleShow,
  cancelClose,
  hideImmediate,
  notifyTriggerPointerEnter,
  notifyTriggerPointerLeave,
  notifyTriggerFocusIn,
  notifyTriggerFocusOut,
  notifyContentPointerEnter,
  notifyContentPointerLeave,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerRegistered,
  triggerElement,
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
})
</script>

<template>
  <slot :open="isOpen" />
</template>
