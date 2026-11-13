<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostPopoverContextKey,
  resolvePopoverHtmlElement,
  type GhostPopoverCloseElement,
  type GhostPopoverCloseExposed,
} from './ghost-popover'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the close control. */
    as?: GhostPopoverCloseElement
    /** Disables closing on click or keyboard activation. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const injected = inject(ghostPopoverContextKey)
if (!injected) {
  throw new Error('GhostPopoverClose must be used inside GhostPopover')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolvePopoverHtmlElement(hostRef.value))

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const closeAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
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
    'data-part': 'close',
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
  if (!event.defaultPrevented) {
    context.close()
  }
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
  context.close()
}

defineExpose<GhostPopoverCloseExposed>({
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
    v-bind="closeAttrs"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>
