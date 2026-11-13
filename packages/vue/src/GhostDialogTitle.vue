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
  type GhostDialogTitleElement,
  type GhostDialogTitleExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog heading. */
    as?: GhostDialogTitleElement
  }>(),
  {
    as: 'h2',
  },
)

const injected = inject(ghostDialogContextKey)
if (!injected) {
  throw new Error('GhostDialogTitle must be used inside GhostDialog')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDialogHtmlElement(hostRef.value))

const titleId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultTitleId.value
})

context.setTitleRegistered(true)

watch(
  titleId,
  (id) => {
    context.setTitleId(id === context.defaultTitleId.value ? null : id)
  },
  { immediate: true },
)

onUnmounted(() => {
  context.setTitleId(null)
  context.setTitleRegistered(false)
})

const titleAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    id: titleId.value,
    'data-part': 'title',
  }
})

defineExpose<GhostDialogTitleExposed>({
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
  <component :is="as" ref="host" v-bind="titleAttrs">
    <slot />
  </component>
</template>
