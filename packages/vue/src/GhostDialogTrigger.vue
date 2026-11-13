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
  ghostDialogContextKey,
  resolveDialogHtmlElement,
  type GhostDialogTriggerElement,
  type GhostDialogTriggerExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the trigger control. */
    as?: GhostDialogTriggerElement
    /** Disables opening or toggling on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const injected = inject(ghostDialogContextKey)
if (!injected) {
  throw new Error('GhostDialogTrigger must be used inside GhostDialog')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveDialogHtmlElement(hostRef.value))

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const triggerId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultTriggerId.value
})

context.setTriggerRegistered(true)

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

onUnmounted(() => {
  context.setTriggerElement(null)
  context.setTriggerId(null)
  context.setTriggerRegistered(false)
})

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'onClick' &&
      key !== 'onKeydown'
    ) {
      rest[key] = value
    }
  }

  const customType = attrs['type']
  const customRole = attrs['role']
  const customTabindex = attrs['tabindex']

  const base: Record<string, unknown> = {
    ...rest,
    id: triggerId.value,
    'aria-haspopup': 'dialog',
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': context.contentId.value,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }

  if (isNativeButtonTag.value) {
    base['type'] = customType ?? 'button'
    base['disabled'] = props.disabled
  } else if (isComponentHost.value) {
    base['disabled'] = props.disabled
    if (customType !== undefined) {
      base['type'] = customType
    }
  } else {
    base['role'] = customRole ?? 'button'
    base['tabindex'] = customTabindex ?? (props.disabled ? undefined : 0)
    if (props.disabled) {
      base['aria-disabled'] = 'true'
    }
  }

  return base
})

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

function handleClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  invokeAttrHandler(attrs['onClick'], event)
  if (event.defaultPrevented) {
    return
  }
  // Ensure the trigger owns focus right before opening so useFocusScope
  // always captures the trigger as previouslyFocused on close.
  if (
    !context.isOpen.value &&
    element.value &&
    document.activeElement !== element.value
  ) {
    element.value.focus({ preventScroll: true })
  }
  context.toggle()
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.disabled) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  if (props.disabled) {
    event.preventDefault()
    return
  }
  if (event.defaultPrevented) {
    return
  }
  const el = element.value
  if (el instanceof HTMLButtonElement) {
    return
  }
  if (
    event.key === 'Enter' &&
    el instanceof HTMLAnchorElement &&
    el.hasAttribute('href')
  ) {
    return
  }
  event.preventDefault()
  context.toggle()
}

defineExpose<GhostDialogTriggerExposed>({
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
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>
