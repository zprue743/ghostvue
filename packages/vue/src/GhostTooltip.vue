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
    /** Milliseconds before hiding after hover/focus ends (WCAG hoverable grace). */
    skipDelayDuration?: number
    /** When `true`, hides immediately on pointer/focus leave. */
    disableHoverableContent?: boolean
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    delayDuration: 700,
    skipDelayDuration: 300,
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

function clearTimers(): void {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function scheduleShow(): void {
  clearTimers()
  if (isOpen.value) {
    return
  }
  openTimer = setTimeout(() => {
    openTimer = null
    open()
  }, props.delayDuration)
}

function scheduleHide(): void {
  clearTimers()
  if (!isOpen.value) {
    return
  }
  const delay = props.disableHoverableContent ? 0 : props.skipDelayDuration
  closeTimer = setTimeout(() => {
    closeTimer = null
    close()
  }, delay)
}

function hideImmediate(): void {
  clearTimers()
  close()
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

onUnmounted(() => {
  clearTimers()
})

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)
const triggerElement = shallowRef<HTMLElement | null>(null)

provide(ghostTooltipContextKey, {
  isOpen,
  delayDuration: computed(() => props.delayDuration),
  skipDelayDuration: computed(() => props.skipDelayDuration),
  disableHoverableContent: computed(() => props.disableHoverableContent),
  scheduleShow,
  scheduleHide,
  hideImmediate,
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
