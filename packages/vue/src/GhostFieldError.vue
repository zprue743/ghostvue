<script setup lang="ts">
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  onUpdated,
  shallowRef,
  useAttrs,
  useSlots,
  useTemplateRef,
} from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  vnodeListHasContent,
  type GhostFieldErrorElement,
  type GhostFieldErrorExposed,
} from './ghost-field'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    as?: GhostFieldErrorElement
  }>(),
  {
    as: 'span',
  },
)

const context = inject(ghostFieldContextKey)
if (!context) {
  throw new Error('GhostFieldError must be used inside GhostField')
}

const slots = useSlots()
const hasContent = shallowRef(false)

function syncContent() {
  const nodes = slots['default']?.() ?? []
  hasContent.value = vnodeListHasContent(nodes)
}

onMounted(() => {
  syncContent()
  context.setErrorVisible(hasContent.value)
  context.setErrorRegistered(hasContent.value)
})

onUpdated(() => {
  syncContent()
  context.setErrorVisible(hasContent.value)
  context.setErrorRegistered(hasContent.value)
})

onUnmounted(() => {
  context.setErrorRegistered(false)
  context.setErrorVisible(false)
})

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))

const errorAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id') {
      rest[key] = value
    }
  }

  const customId = attrs['id']
  const id =
    typeof customId === 'string' && customId.length > 0
      ? customId
      : context.errorId.value

  return {
    ...rest,
    id,
    role: 'alert',
    'data-part': 'error',
  }
})

defineExpose<GhostFieldErrorExposed>({
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
  <component :is="as" v-if="hasContent" ref="host" v-bind="errorAttrs">
    <slot />
  </component>
</template>
