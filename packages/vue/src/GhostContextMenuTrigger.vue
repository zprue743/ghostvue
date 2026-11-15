<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostContextMenuContextKey,
  resolveContextMenuHtmlElement,
  type GhostContextMenuTriggerElement,
  type GhostContextMenuTriggerExposed,
} from './ghost-context-menu'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostContextMenuTriggerElement
    disabled?: boolean
    longPressDelay?: number
  }>(),
  {
    as: 'span',
    disabled: false,
    longPressDelay: 500,
  },
)

const injected = inject(ghostContextMenuContextKey)
if (!injected) {
  throw new Error(
    'GhostContextMenuTrigger must be used inside GhostContextMenu',
  )
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveContextMenuHtmlElement(hostRef.value))

const triggerId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultTriggerId.value
})

watch(
  triggerId,
  (id) => {
    context.setTriggerId(id === context.defaultTriggerId.value ? null : id)
  },
  { immediate: true },
)

watch(
  element,
  (el) => {
    context.setTriggerElement(el)
  },
  { immediate: true, flush: 'post' },
)

const LONG_PRESS_MOVE_TOLERANCE_PX = 10

let longPressTimer: ReturnType<typeof setTimeout> | undefined
let longPressPointerId: number | undefined
let longPressStartX = 0
let longPressStartY = 0

function clearLongPress(): void {
  if (longPressTimer !== undefined) {
    clearTimeout(longPressTimer)
    longPressTimer = undefined
  }
  longPressPointerId = undefined
}

onUnmounted(() => {
  clearLongPress()
  context.setTriggerElement(null)
  context.setTriggerId(null)
})

function openAtClientPoint(clientX: number, clientY: number): boolean {
  if (props.disabled) {
    return false
  }
  const el = element.value
  if (el && document.activeElement !== el && !context.isOpen.value) {
    el.focus({ preventScroll: true })
  }
  context.openAtPointer(clientX, clientY)
  return true
}

function openAtKeyboard(): boolean {
  if (props.disabled) {
    return false
  }
  const el = element.value
  if (!el) {
    return false
  }
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  return openAtClientPoint(x, y)
}

function invokeAttrHandler(handler: unknown, event: Event): void {
  if (typeof handler === 'function') {
    ;(handler as (event: Event) => void)(event)
  } else if (Array.isArray(handler)) {
    for (const fn of handler) {
      if (typeof fn === 'function') {
        ;(fn as (event: Event) => void)(event)
      }
    }
  }
}

function handleContextMenu(event: MouseEvent): void {
  invokeAttrHandler(attrs['onContextmenu'], event)
  if (props.disabled || event.defaultPrevented) {
    return
  }
  if (openAtClientPoint(event.clientX, event.clientY)) {
    event.preventDefault()
  }
}

function handlePointerDown(event: PointerEvent): void {
  if (props.disabled || event.button !== 0) {
    return
  }
  if (event.pointerType === 'mouse') {
    return
  }
  clearLongPress()
  longPressPointerId = event.pointerId
  longPressStartX = event.clientX
  longPressStartY = event.clientY
  longPressTimer = setTimeout(() => {
    longPressTimer = undefined
    if (longPressPointerId === undefined) {
      return
    }
    if (openAtClientPoint(longPressStartX, longPressStartY)) {
      // Suppress the synthetic contextmenu some platforms emit after long-press.
      const suppressFollowingContextMenu = (menuEvent: Event): void => {
        menuEvent.preventDefault()
        element.value?.removeEventListener(
          'contextmenu',
          suppressFollowingContextMenu,
          true,
        )
      }
      element.value?.addEventListener(
        'contextmenu',
        suppressFollowingContextMenu,
        true,
      )
    }
    longPressPointerId = undefined
  }, props.longPressDelay)
}

function handlePointerMove(event: PointerEvent): void {
  if (
    longPressPointerId === undefined ||
    event.pointerId !== longPressPointerId
  ) {
    return
  }
  const deltaX = Math.abs(event.clientX - longPressStartX)
  const deltaY = Math.abs(event.clientY - longPressStartY)
  if (
    deltaX > LONG_PRESS_MOVE_TOLERANCE_PX ||
    deltaY > LONG_PRESS_MOVE_TOLERANCE_PX
  ) {
    clearLongPress()
  }
}

function handlePointerUp(event: PointerEvent): void {
  if (
    longPressPointerId === undefined ||
    event.pointerId !== longPressPointerId
  ) {
    return
  }
  clearLongPress()
}

function handlePointerCancel(event: PointerEvent): void {
  if (
    longPressPointerId === undefined ||
    event.pointerId !== longPressPointerId
  ) {
    return
  }
  clearLongPress()
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.disabled) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
  if (event.defaultPrevented || props.disabled) {
    return
  }
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault()
    openAtKeyboard()
  }
}

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'onContextmenu' &&
      key !== 'onKeydown' &&
      key !== 'onPointerdown' &&
      key !== 'onPointermove' &&
      key !== 'onPointerup' &&
      key !== 'onPointercancel'
    ) {
      rest[key] = value
    }
  }

  return {
    ...rest,
    id: triggerId.value,
    tabindex: rest['tabindex'] ?? 0,
    'aria-haspopup': 'menu',
    'aria-controls': context.isOpen.value ? context.contentId.value : undefined,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    'aria-disabled': props.disabled ? 'true' : undefined,
  }
})

defineExpose<GhostContextMenuTriggerExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component
    :is="as"
    ref="host"
    v-bind="triggerAttrs"
    @contextmenu="handleContextMenu"
    @keydown="handleKeydown"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <slot />
  </component>
</template>
