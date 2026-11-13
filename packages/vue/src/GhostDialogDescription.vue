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
  type GhostDialogDescriptionElement,
  type GhostDialogDescriptionExposed,
} from './ghost-dialog'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the dialog description. */
    as?: GhostDialogDescriptionElement
  }>(),
  {
    as: 'p',
  },
)

const injected = inject(ghostDialogContextKey)
if (!injected) {
  throw new Error('GhostDialogDescription must be used inside GhostDialog')
}
const context = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveDialogHtmlElement(hostRef.value))

const descriptionId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : context.defaultDescriptionId.value
})

context.setDescriptionRegistered(true)

watch(
  descriptionId,
  (id) => {
    context.setDescriptionId(
      id === context.defaultDescriptionId.value ? null : id,
    )
  },
  { immediate: true },
)

onUnmounted(() => {
  context.setDescriptionId(null)
  context.setDescriptionRegistered(false)
})

const descriptionAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id') {
      rest[key] = value
    }
  }

  return {
    ...rest,
    id: descriptionId.value,
    'data-part': 'description',
  }
})

defineExpose<GhostDialogDescriptionExposed>({
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
  <component :is="as" ref="host" v-bind="descriptionAttrs">
    <slot />
  </component>
</template>
