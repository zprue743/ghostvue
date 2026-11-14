<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

import type { GhostInputExposed, GhostInputType } from './ghost-input'
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

const { rootProps, restoreDefault } = useGhostInput({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  invalid: () => props.invalid,
  required: () => props.required,
  type: () => props.type,
  onChange: (value) => {
    emit('update:modelValue', value)
  },
})

const element = useTemplateRef<HTMLInputElement>('element')

let form: HTMLFormElement | null = null

function onReset() {
  // Browser reset writes the native default, then Vue would reapply `value`
  // unless the model is updated in this same turn.
  restoreDefault()
}

onMounted(() => {
  form = element.value?.form ?? null
  form?.addEventListener('reset', onReset)
})

onUnmounted(() => {
  form?.removeEventListener('reset', onReset)
})

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
