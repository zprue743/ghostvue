<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostNumberInputExposed } from './ghost-number-input'
import { useNativeFormReset } from './form-reset'
import { useGhostNumberInput } from './use-ghost-number-input'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: number | null | undefined
    defaultValue?: number | null
    min?: number | undefined
    max?: number | undefined
    step?: number
    locale?: string | undefined
    formatOptions?: Intl.NumberFormatOptions | undefined
    disabled?: boolean
    readonly?: boolean
    invalid?: boolean
    required?: boolean
    decrementLabel?: string
    incrementLabel?: string
  }>(),
  {
    modelValue: undefined,
    defaultValue: null,
    min: undefined,
    max: undefined,
    step: 1,
    locale: undefined,
    formatOptions: undefined,
    disabled: false,
    readonly: false,
    invalid: false,
    required: false,
    decrementLabel: 'Decrease',
    incrementLabel: 'Increase',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const element = useTemplateRef<HTMLInputElement>('element')
const attrs = useAttrs()

const {
  rootProps,
  inputProps,
  decrementProps,
  incrementProps,
  increment,
  decrement,
  applyFormReset,
} = useGhostNumberInput({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  min: () => props.min,
  max: () => props.max,
  step: () => props.step,
  locale: () => props.locale,
  formatOptions: () => props.formatOptions,
  disabled: () => props.disabled,
  readonly: () => props.readonly,
  invalid: () => props.invalid,
  required: () => props.required,
  decrementLabel: () => props.decrementLabel,
  incrementLabel: () => props.incrementLabel,
  element,
  onChange: (value) => {
    emit('update:modelValue', value)
  },
})

useNativeFormReset(() => element.value, applyFormReset)

const rootBindings = computed(() => ({
  ...rootProps.value,
  'data-size': attrs['data-size'],
  'data-block': attrs['data-block'],
}))

const inputBindings = computed(() => {
  const base = inputProps.value
  const inputAttrs = { ...attrs }
  delete inputAttrs['data-size']
  delete inputAttrs['data-block']
  const extraClass = inputAttrs.class
  delete inputAttrs.class
  return {
    ...inputAttrs,
    ...base,
    class: extraClass ? [base.class, extraClass] : base.class,
    onBlur: (event: FocusEvent) => {
      invokeFocusHandler(attrs['onBlur'], event)
      base.onBlur(event)
    },
    onFocus: (event: FocusEvent) => {
      invokeFocusHandler(attrs['onFocus'], event)
      base.onFocus(event)
    },
    onInput: (event: Event) => {
      invokeInputHandler(attrs['onInput'], event)
      base.onInput(event)
    },
    onKeydown: (event: KeyboardEvent) => {
      invokeKeydownHandler(attrs['onKeydown'], event)
      base.onKeydown(event)
    },
  }
})

function invokeFocusHandler(handler: unknown, event: FocusEvent): void {
  invokeEventHandler(handler, event)
}

function invokeInputHandler(handler: unknown, event: Event): void {
  invokeEventHandler(handler, event)
}

function invokeKeydownHandler(handler: unknown, event: KeyboardEvent): void {
  invokeEventHandler(handler, event)
}

function isEventHandler(value: unknown): value is (event: Event) => void {
  return typeof value === 'function'
}

function invokeEventHandler(handler: unknown, event: Event): void {
  if (isEventHandler(handler)) {
    handler(event)
    return
  }
  if (Array.isArray(handler)) {
    for (const entry of handler) {
      invokeEventHandler(entry, event)
    }
  }
}

defineExpose<GhostNumberInputExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
  increment,
  decrement,
})
</script>

<template>
  <span v-bind="rootBindings">
    <button v-bind="decrementProps">−</button>
    <input ref="element" v-bind="inputBindings" />
    <button v-bind="incrementProps">+</button>
  </span>
</template>
