<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { SlButtonExposed, SlButtonType } from './sl-button'
import { useSlButton } from './use-sl-button'

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
const props = withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    type?: SlButtonType
  }>(),
  {
    disabled: false,
    loading: false,
    type: 'button',
  },
)

const { rootProps } = useSlButton({
  disabled: () => props.disabled,
  loading: () => props.loading,
  type: () => props.type,
})

const element = useTemplateRef<HTMLButtonElement>('element')

defineExpose<SlButtonExposed>({
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
  <button ref="element" v-bind="rootProps">
    <slot />
  </button>
</template>
