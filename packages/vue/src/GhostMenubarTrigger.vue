<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostMenubarContextKey,
  ghostMenubarMenuContextKey,
  resolveMenubarHtmlElement,
  type GhostMenubarTriggerElement,
  type GhostMenubarTriggerExposed,
} from './ghost-menubar'
import { invokeAttrHandler } from './invoke-attr-handler'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostMenubarTriggerElement
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const menuContext = inject(ghostMenubarMenuContextKey)
if (!menuContext) {
  throw new Error('GhostMenubarTrigger must be used inside GhostMenubarMenu')
}
const context = menuContext

const menubarContext = inject(ghostMenubarContextKey)
if (!menubarContext) {
  throw new Error('GhostMenubarTrigger must be used inside GhostMenubar')
}
const menubar = menubarContext

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const openedByHover = shallowRef(false)

const element = computed(() => resolveMenubarHtmlElement(hostRef.value))

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

watch(
  () => context.isOpen.value,
  (open) => {
    if (!open) {
      openedByHover.value = false
    }
  },
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
    role: customRole ?? 'menuitem',
    'aria-haspopup': 'menu',
    'aria-expanded': String(context.isOpen.value),
    'aria-controls': context.isOpen.value ? context.contentId.value : undefined,
    'data-part': 'trigger',
    'data-state': context.isOpen.value ? 'open' : 'closed',
  }

  const rovingTabIndex =
    customTabindex ??
    (element.value &&
    menubar.triggerTabStop.value &&
    menubar.triggerTabStop.value === element.value
      ? 0
      : -1)

  if (isNativeButtonTag.value) {
    base['type'] = customType ?? 'button'
    base['disabled'] = props.disabled
    if (!props.disabled) {
      base['tabindex'] = rovingTabIndex
    }
  } else if (isComponentHost.value) {
    base['disabled'] = props.disabled
    if (customType !== undefined) {
      base['type'] = customType
    }
  } else {
    base['tabindex'] = props.disabled ? undefined : rovingTabIndex
    if (props.disabled) {
      base['aria-disabled'] = 'true'
    }
  }

  return base
})

function handlePointerEnter(): void {
  if (props.disabled || !menubar.hasOpenMenu() || context.isOpen.value) {
    return
  }
  context.setFocusLastOnOpen(false)
  context.open()
  openedByHover.value = true
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
  if (openedByHover.value) {
    openedByHover.value = false
    return
  }
  if (element.value && document.activeElement !== element.value) {
    element.value.focus({ preventScroll: true })
  }
  if (menubar.hasOpenMenu() && !context.isOpen.value) {
    context.setFocusLastOnOpen(false)
    context.open()
    return
  }
  context.toggle()
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.disabled) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
  if (event.defaultPrevented) {
    return
  }
  if (props.disabled) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
    }
    return
  }

  const el = element.value
  const horizontalKey =
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    event.key === 'Home' ||
    event.key === 'End'

  if (el && horizontalKey) {
    event.preventDefault()
    if (
      context.isOpen.value &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      menubar.openAdjacentMenu(el, event.key)
      return
    }
    if (context.isOpen.value) {
      context.close()
    }
    menubar.moveTriggerFocus(el, event.key)
    return
  }

  if (
    !context.isOpen.value &&
    (event.key === 'ArrowDown' || event.key === 'ArrowUp')
  ) {
    event.preventDefault()
    context.setFocusLastOnOpen(event.key === 'ArrowUp')
    if (element.value && document.activeElement !== element.value) {
      element.value.focus({ preventScroll: true })
    }
    context.open()
    return
  }

  if (!context.isOpen.value && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    context.setFocusLastOnOpen(false)
    if (element.value && document.activeElement !== element.value) {
      element.value.focus({ preventScroll: true })
    }
    context.open()
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
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

defineExpose<GhostMenubarTriggerExposed>({
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
    @pointerenter="handlePointerEnter"
  >
    <slot />
  </component>
</template>
