<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { SlButtonExposed, SlButtonProps } from './sl-button'
import { useSlButton } from './use-sl-button'

const props = withDefaults(defineProps<SlButtonProps>(), {
  disabled: false,
  loading: false,
  type: 'button',
})

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
