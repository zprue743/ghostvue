<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  watchEffect,
} from 'vue'

import { ghostTooltipContextKey } from './ghost-tooltip'
import { ghostTooltipProviderContextKey } from './ghost-tooltip-provider'
import { useGhostTooltip } from './use-ghost-tooltip'

const tooltipProvider = inject(ghostTooltipProviderContextKey, null)

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
    closeDelay: 300,
    disableHoverableContent: false,
  },
)

const resolvedDelayDuration = computed(() => {
  if (props.delayDuration !== undefined) {
    return props.delayDuration
  }
  if (tooltipProvider) {
    return tooltipProvider.delayDuration.value
  }
  return 700
})

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

function resolveScheduleOpenDelay(viaPointer: boolean): number {
  if (tooltipProvider) {
    return tooltipProvider.resolveOpenDelay(props.delayDuration, viaPointer)
  }
  return resolvedDelayDuration.value
}

function runOpen(): void {
  open()
  tooltipProvider?.onTooltipDidOpen()
}

function runClose(): void {
  if (!isOpen.value) {
    return
  }
  close()
  tooltipProvider?.onTooltipDidClose()
}

function scheduleOpen(viaPointer: boolean): void {
  clearCloseTimer()
  if (isOpen.value) {
    return
  }
  clearOpenTimer()
  const delay = resolveScheduleOpenDelay(viaPointer)
  openTimer = setTimeout(() => {
    openTimer = null
    runOpen()
  }, delay)
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
      runClose()
    }
  }, delay)
}

function hideImmediate(): void {
  clearOpenTimer()
  clearCloseTimer()
  runClose()
}

function notifyTriggerPointerEnter(): void {
  triggerPointer.value = true
  scheduleOpen(true)
}

function notifyTriggerPointerLeave(): void {
  triggerPointer.value = false
  maybeScheduleClose()
}

function notifyTriggerFocusIn(): void {
  triggerFocus.value = true
  scheduleOpen(false)
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
  delayDuration: resolvedDelayDuration,
  closeDelay: computed(() => props.closeDelay),
  disableHoverableContent: computed(() => props.disableHoverableContent),
  scheduleShow: () => {
    scheduleOpen(true)
  },
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
