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
  ghostCollapsibleContextKey,
  resolveCollapsibleHtmlElement,
  type GhostCollapsibleContentElement,
  type GhostCollapsibleContentExposed,
} from './ghost-collapsible'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the disclosure panel. */
    as?: GhostCollapsibleContentElement
    /** Skips theme height animations even when motion is allowed. */
    disableAnimation?: boolean
  }>(),
  {
    as: 'div',
    disableAnimation: false,
  },
)

const injected = inject(ghostCollapsibleContextKey)
if (!injected) {
  throw new Error(
    'GhostCollapsibleContent must be used inside GhostCollapsible',
  )
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')

const element = computed(() => resolveCollapsibleHtmlElement(hostRef.value))

const contentId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultContentId.value
})

const hasExplicitLabel = computed(() => {
  return (
    typeof attrs['aria-label'] === 'string' ||
    typeof attrs['aria-labelledby'] === 'string'
  )
})

watch(
  contentId,
  (id) => {
    context.setContentId(id === context.defaultContentId.value ? null : id)
  },
  { immediate: true },
)

onUnmounted(() => {
  context.setContentId(null)
})

const contentAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'hidden') {
      rest[key] = value
    }
  }

  const result: Record<string, unknown> = {
    ...rest,
    id: contentId.value,
    hidden: !context.isOpen.value,
    'data-part': 'content',
    'data-state': context.isOpen.value ? 'open' : 'closed',
    ...(props.disableAnimation ? { 'data-animation': 'off' } : {}),
  }

  if (!hasExplicitLabel.value && context.triggerRegistered.value) {
    result['aria-labelledby'] = context.triggerId.value
  }

  return result
})

defineExpose<GhostCollapsibleContentExposed>({
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
    class="ghost-collapsible-content"
    v-bind="contentAttrs"
  >
    <slot />
  </component>
</template>
