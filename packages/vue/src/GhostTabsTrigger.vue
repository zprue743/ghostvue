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
  ghostTabsContextKey,
  resolveTabsHtmlElement,
  type GhostTabsTriggerElement,
  type GhostTabsTriggerExposed,
} from './ghost-tabs'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the tab control. */
    as?: GhostTabsTriggerElement
    /** Stable value identifying this tab and its panel. */
    value: string
    /** Disables selection and removes the tab from roving focus. */
    disabled?: boolean
  }>(),
  {
    as: 'button',
    disabled: false,
  },
)

const context = inject(ghostTabsContextKey)
if (!context) {
  throw new Error('GhostTabsTrigger must be used inside GhostTabs')
}
const tabsContext = context

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveTabsHtmlElement(hostRef.value))

const isNativeButtonTag = computed(() => props.as === 'button')
const isComponentHost = computed(() => typeof props.as !== 'string')

const defaultTriggerId = useGhostId('ghost-tabs-trigger')
const triggerId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultTriggerId.value
})

const panelId = computed(() => {
  void tabsContext.registryVersion.value
  return tabsContext.getPanelId(props.value)
})

watch(
  triggerId,
  (id) => {
    tabsContext.registerTrigger(props.value, id)
  },
  { immediate: true },
)

watch(
  () => props.value,
  (value, previous) => {
    if (previous) {
      tabsContext.unregisterTrigger(previous)
    }
    tabsContext.registerTrigger(value, triggerId.value)
  },
)

onUnmounted(() => {
  tabsContext.unregisterTrigger(props.value)
})

const active = computed(() => tabsContext.isSelected(props.value))

const triggerAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (
      key !== 'id' &&
      key !== 'type' &&
      key !== 'role' &&
      key !== 'tabindex' &&
      key !== 'onClick' &&
      key !== 'onKeydown' &&
      key !== 'onFocus'
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
    role: 'tab',
    class: 'ghost-tabs-trigger',
    'aria-selected': String(active.value),
    'data-part': 'trigger',
    'data-ghost-tabs': '',
    'data-state': active.value ? 'active' : 'inactive',
  }

  if (panelId.value) {
    base['aria-controls'] = panelId.value
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
    base['role'] = customRole ?? 'tab'
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
  tabsContext.select(props.value)
}

function handleFocus(event: FocusEvent): void {
  invokeAttrHandler(attrs['onFocus'], event)
  if (event.defaultPrevented || props.disabled) {
    return
  }
  if (tabsContext.activationMode.value === 'automatic') {
    tabsContext.select(props.value)
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.disabled) {
    invokeAttrHandler(attrs['onKeydown'], event)
  }
  if (tabsContext.activationMode.value !== 'manual') {
    return
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
  tabsContext.select(props.value)
}

defineExpose<GhostTabsTriggerExposed>({
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
    @focus="handleFocus"
    @keydown="handleKeydown"
  >
    <slot />
  </component>
</template>
