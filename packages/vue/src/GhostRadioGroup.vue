<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue'

import { useNativeFormReset } from './form-reset'
import {
  ghostRadioGroupContextKey,
  type GhostRadioGroupElement,
  type GhostRadioGroupExposed,
  type GhostRadioGroupOrientation,
} from './ghost-radio-group'
import { useGhostRadioGroup } from './use-ghost-radio-group'
import { useRovingFocus, type TextDirection } from './use-roving-focus'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    modelValue?: string | undefined
    defaultValue?: string | undefined
    name?: string | undefined
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    orientation?: GhostRadioGroupOrientation
    dir?: TextDirection | undefined
    as?: GhostRadioGroupElement
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    name: undefined,
    disabled: false,
    required: false,
    invalid: false,
    orientation: 'vertical',
    dir: undefined,
    as: 'fieldset',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const rootRef = useTemplateRef<HTMLElement>('root')

const group = useGhostRadioGroup({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  name: () => props.name,
  disabled: () => props.disabled,
  required: () => props.required,
  invalid: () => props.invalid,
  orientation: () => props.orientation,
  dir: () => props.dir,
  onValueChange: (value) => {
    emit('update:modelValue', value)
  },
})

useRovingFocus(rootRef, {
  orientation: () => props.orientation,
  loop: true,
  ...(props.dir
    ? {
        dir: (): TextDirection => (props.dir === 'rtl' ? 'rtl' : 'ltr'),
      }
    : {}),
})

useNativeFormReset(() => rootRef.value, group.applyFormReset)

provide(ghostRadioGroupContextKey, {
  selectedValue: group.selectedValue,
  name: group.name,
  disabled: group.disabled,
  required: group.required,
  select: group.select,
  isSelected: group.isSelected,
  isItemDisabled: group.isItemDisabled,
  registerItem: group.registerItem,
  setItemDisabled: group.setItemDisabled,
  unregisterItem: group.unregisterItem,
  restoreItemDom: group.restoreItemDom,
  registryVersion: group.registryVersion,
})

const isFieldset = computed(() => props.as === 'fieldset')

const rootBindings = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'class') {
      rest[key] = value
    }
  }

  const dataState = props.invalid
    ? 'invalid'
    : props.disabled
      ? 'disabled'
      : undefined

  const base: Record<string, unknown> = {
    ...rest,
    class: ['ghost-radio-group', attrs.class].filter(Boolean),
    'data-part': 'root',
    'data-ghost-radio-group': '',
    'data-orientation': props.orientation,
    'aria-invalid': props.invalid ? true : undefined,
  }

  if (dataState) {
    base['data-state'] = dataState
  }

  if (isFieldset.value) {
    base['disabled'] = props.disabled || undefined
  } else {
    base['role'] = 'radiogroup'
    if (props.disabled) {
      base['aria-disabled'] = 'true'
    }
  }

  return base
})

function focusedItemInput(): HTMLInputElement | null {
  void group.registryVersion.value
  const selected = group.selectedValue.value
  const root = rootRef.value
  if (!root) {
    return null
  }
  const inputs = root.querySelectorAll<HTMLInputElement>(
    'input.ghost-radio-group-item[type="radio"]:not([disabled])',
  )
  if (selected) {
    for (const input of inputs) {
      if (input.value === selected) {
        return input
      }
    }
  }
  return inputs[0] ?? null
}

defineExpose<GhostRadioGroupExposed>({
  get element() {
    return rootRef.value
  },
  focus(options?: FocusOptions) {
    focusedItemInput()?.focus(options)
  },
  blur() {
    focusedItemInput()?.blur()
  },
})
</script>

<template>
  <component :is="as" ref="root" v-bind="rootBindings">
    <slot />
  </component>
</template>
