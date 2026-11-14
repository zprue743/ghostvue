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
  type GhostTabsContentElement,
  type GhostTabsContentExposed,
} from './ghost-tabs'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the tab panel. */
    as?: GhostTabsContentElement
    /** Panel value; must match a {@link GhostTabsTrigger} `value`. */
    value: string
  }>(),
  {
    as: 'div',
  },
)

const context = inject(ghostTabsContextKey)
if (!context) {
  throw new Error('GhostTabsContent must be used inside GhostTabs')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveTabsHtmlElement(hostRef.value))

const defaultPanelId = useGhostId('ghost-tabs-content')
const panelId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultPanelId.value
})

const triggerId = computed(() => {
  void context.registryVersion.value
  return context.getTriggerId(props.value)
})
const active = computed(() => context.isSelected(props.value))

watch(
  panelId,
  (id) => {
    context.registerPanel(props.value, id)
  },
  { immediate: true },
)

watch(
  () => props.value,
  (value, previous) => {
    if (previous) {
      context.unregisterPanel(previous)
    }
    context.registerPanel(value, panelId.value)
  },
)

onUnmounted(() => {
  context.unregisterPanel(props.value)
})

const contentAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  delete rest['id']

  const labeledBy = triggerId.value
  const base: Record<string, unknown> = {
    ...rest,
    id: panelId.value,
    role: 'tabpanel',
    class: 'ghost-tabs-content',
    tabindex: active.value ? 0 : -1,
    'data-part': 'content',
    'data-ghost-tabs': '',
    'data-state': active.value ? 'active' : 'inactive',
  }

  if (labeledBy) {
    base['aria-labelledby'] = labeledBy
  }

  return base
})

defineExpose<GhostTabsContentExposed>({
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
  <component :is="as" ref="host" v-bind="contentAttrs" :hidden="!active">
    <slot />
  </component>
</template>
