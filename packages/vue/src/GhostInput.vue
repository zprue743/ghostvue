<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { GhostInputExposed, GhostInputType } from './ghost-input'
import { useNativeFormReset } from './form-reset'
import { useGhostInput } from './use-ghost-input'

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
// Explicit `modelValue: undefined` keeps omitted strings uncontrolled in
// useControllableState instead of becoming ''.
const props = withDefaults(
  defineProps<{
    /** Controlled value. Omit for uncontrolled mode. */
    modelValue?: string | undefined
    defaultValue?: string
    disabled?: boolean
    readonly?: boolean
    invalid?: boolean
    required?: boolean
    type?: GhostInputType
  }>(),
  {
    modelValue: undefined,
    defaultValue: '',
    disabled: false,
    readonly: false,
    invalid: false,
    required: false,
    type: 'text',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const element = useTemplateRef<HTMLInputElement>('element')

const { rootProps, applyFormReset } = useGhostInput({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  invalid: () => props.invalid,
  required: () => props.required,
  type: () => props.type,
  element,
  onChange: (value) => {
    emit('update:modelValue', value)
  },
})

useNativeFormReset(() => element.value, applyFormReset)

defineExpose<GhostInputExposed>({
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
