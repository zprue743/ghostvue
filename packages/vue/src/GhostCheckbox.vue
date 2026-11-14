<script setup lang="ts">
import { useTemplateRef, watch, type PropType } from 'vue'

import type { GhostCheckboxExposed } from './ghost-checkbox'
import { useNativeFormReset } from './form-reset'
import { useGhostCheckbox } from './use-ghost-checkbox'

// Runtime props so `modelValue` can default to `undefined`. Type-only Boolean
// props coerce omitted values to false, which looks controlled and drops defaultValue.
const props = defineProps({
  modelValue: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  defaultValue: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const element = useTemplateRef<HTMLInputElement>('element')

const { isChecked, isIndeterminate, rootProps, applyFormReset } =
  useGhostCheckbox({
    modelValue: () => props.modelValue,
    defaultValue: () => props.defaultValue,
    indeterminate: () => props.indeterminate,
    disabled: () => props.disabled,
    element,
    onChange: (value) => {
      emit('update:modelValue', value)
    },
  })

useNativeFormReset(() => element.value, applyFormReset)

// `indeterminate` is a DOM property, not an HTML attribute. Re-apply after
// `:checked` updates because some engines clear the property when `checked` is set.
watch(
  [element, isIndeterminate, isChecked],
  () => {
    const input = element.value
    if (!input) return
    input.indeterminate = isIndeterminate.value
  },
  { flush: 'post' },
)

defineExpose<GhostCheckboxExposed>({
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
  <input ref="element" v-bind="rootProps" />
</template>
