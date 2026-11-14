<script setup lang="ts">
import { computed, inject, shallowRef, useAttrs, useTemplateRef } from 'vue'

import {
  ghostFieldContextKey,
  resolveFieldHtmlElement,
  type GhostFieldErrorElement,
  type GhostFieldErrorExposed,
} from './ghost-field'
import { useGhostFieldPartContent } from './use-ghost-field-part-content'

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

const attrs = useAttrs()
const hostRef = useTemplateRef<HTMLElement>('host')
const element = computed(() => resolveFieldHtmlElement(hostRef.value))
const visible = shallowRef(false)

useGhostFieldPartContent(hostRef, (next) => {
  visible.value = next
  context.setErrorVisible(next)
  context.setErrorRegistered(next)
})

const errorAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id' && key !== 'hidden' && key !== 'role') {
      rest[key] = value
    }
  }

  const customId = attrs['id']
  const id =
    typeof customId === 'string' && customId.length > 0
      ? customId
      : context.errorId.value

  const result: Record<string, unknown> = {
    ...rest,
    id,
    'data-part': 'error',
  }

  if (visible.value) {
    result['role'] = 'alert'
  } else {
    result['hidden'] = true
  }

  return result
})

defineExpose<GhostFieldErrorExposed>({
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
  <component :is="as" ref="host" v-bind="errorAttrs">
    <slot />
  </component>
</template>
