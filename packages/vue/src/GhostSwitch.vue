<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostSwitchExposed } from './ghost-switch'
import { useNativeFormReset } from './form-reset'
import { useGhostSwitch } from './use-ghost-switch'

defineOptions({ inheritAttrs: false })

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
// Explicit `modelValue: undefined` prevents Vue from coercing an omitted boolean
// prop to `false`, preserving uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    modelValue?: boolean | undefined
    defaultValue?: boolean
    disabled?: boolean
    readonly?: boolean
    name?: string | undefined
    value?: string
    form?: string | undefined
  }>(),
  {
    modelValue: undefined,
    defaultValue: false,
    disabled: false,
    readonly: false,
    value: 'on',
    name: undefined,
    form: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [checked: boolean]
}>()

const element = useTemplateRef<HTMLButtonElement>('element')
const formInput = useTemplateRef<HTMLInputElement>('formInput')
const attrs = useAttrs()

function isMouseHandler(value: unknown): value is (event: MouseEvent) => void {
  return typeof value === 'function'
}

function invokeMouseHandler(handler: unknown, event: MouseEvent): void {
  if (isMouseHandler(handler)) {
    handler(event)
    return
  }
  if (Array.isArray(handler)) {
    for (const entry of handler) {
      invokeMouseHandler(entry, event)
    }
  }
}

const { checked, rootProps, inputProps, toggle, applyFormReset } =
  useGhostSwitch({
    modelValue: () => props.modelValue,
    defaultValue: () => props.defaultValue,
    disabled: () => props.disabled,
    readonly: () => props.readonly,
    name: () => props.name,
    value: () => props.value,
    form: () => props.form,
    onChange: (next) => {
      emit('update:modelValue', next)
    },
    element,
  })

useNativeFormReset(() => formInput.value ?? element.value, applyFormReset)

// Fragment root (button + hidden input) cannot use automatic fallthrough.
// Consumer onClick runs first so preventDefault can cancel the toggle.
const buttonBindings = computed(() => {
  const root = rootProps.value
  const extraClass = attrs.class
  return {
    ...attrs,
    ...root,
    class: extraClass ? [root.class, extraClass] : root.class,
    onClick: (event: MouseEvent) => {
      invokeMouseHandler(attrs['onClick'], event)
      root.onClick(event)
    },
  }
})

defineExpose<GhostSwitchExposed>({
  get element() {
    return element.value
  },
  get checked() {
    return checked.value
  },
  toggle,
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <button ref="element" v-bind="buttonBindings">
    <span data-part="track" aria-hidden="true">
      <span data-part="thumb" />
    </span>
    <slot />
  </button>
  <input ref="formInput" v-bind="inputProps" />
</template>
