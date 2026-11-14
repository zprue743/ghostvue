<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type { GhostTextareaExposed } from './ghost-textarea'
import { useNativeFormReset } from './form-reset'
import { useGhostTextarea } from './use-ghost-textarea'

// Declared props only; native HTML/ARIA stay fallthrough so Field can wire id.
// Explicit `modelValue: undefined` preserves uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    modelValue?: string | undefined
    defaultValue?: string
    disabled?: boolean
    readonly?: boolean
    invalid?: boolean
    required?: boolean
    rows?: number
    maxRows?: number
    autoResize?: boolean
  }>(),
  {
    modelValue: undefined,
    defaultValue: '',
    disabled: false,
    readonly: false,
    invalid: false,
    required: false,
    rows: 2,
    autoResize: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const element = useTemplateRef<HTMLTextAreaElement>('element')

const { rootProps, applyFormReset } = useGhostTextarea({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  invalid: () => props.invalid,
  required: () => props.required,
  rows: () => props.rows,
  maxRows: () => props.maxRows,
  autoResize: () => props.autoResize,
  element,
  onValueChange: (value) => {
    emit('update:modelValue', value)
  },
})

useNativeFormReset(() => element.value, applyFormReset)

defineExpose<GhostTextareaExposed>({
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
  <textarea ref="element" v-bind="rootProps" />
</template>
