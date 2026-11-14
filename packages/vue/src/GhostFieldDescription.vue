<script setup lang="ts">
import { computed, inject, onUnmounted, useAttrs, useTemplateRef } from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  type GhostFieldDescriptionElement,
  type GhostFieldDescriptionExposed,
} from './ghost-field'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    as?: GhostFieldDescriptionElement
  }>(),
  {
    as: 'p',
  },
)

const context = inject(ghostFieldContextKey)
if (!context) {
  throw new Error('GhostFieldDescription must be used inside GhostField')
}

context.setDescriptionRegistered(true)
onUnmounted(() => {
  context.setDescriptionRegistered(false)
})

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))

const descriptionAttrs = computed(() => {
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
      : context.descriptionId.value

  return {
    ...rest,
    id,
    'data-part': 'description',
  }
})

defineExpose<GhostFieldDescriptionExposed>({
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
