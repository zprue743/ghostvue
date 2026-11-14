<script setup lang="ts">
import { computed, inject, shallowRef, useAttrs, useTemplateRef } from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  type GhostFieldDescriptionElement,
  type GhostFieldDescriptionExposed,
} from './ghost-field'
import { useGhostFieldPartContent } from './use-ghost-field-part-content'

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

const attrs = useAttrs()
const hostRef = useTemplateRef<HTMLElement>('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))
const visible = shallowRef(false)

useGhostFieldPartContent(hostRef, (next) => {
  visible.value = next
  context.setDescriptionRegistered(next)
})

const descriptionAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'hidden') {
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
    hidden: visible.value ? undefined : true,
  }
})

defineExpose<GhostFieldDescriptionExposed>({
  get element() {
    return visible.value ? element.value : null
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
