<script setup lang="ts">
import { computed, provide, useAttrs } from 'vue'

import {
  ghostDropdownMenuRadioGroupContextKey,
  type GhostDropdownMenuRadioGroupElement,
} from './ghost-dropdown-menu'
import { useControllableState } from './use-controllable-state'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostDropdownMenuRadioGroupElement
    modelValue?: string | undefined
    defaultValue?: string | undefined
    disabled?: boolean
  }>(),
  {
    as: 'div',
    modelValue: undefined,
    defaultValue: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedValue = useControllableState<string | undefined>({
  prop: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  onChange: (next) => {
    if (next !== undefined) {
      emit('update:modelValue', next)
    }
  },
})

const groupDisabled = computed(() => props.disabled)

function select(value: string): void {
  if (groupDisabled.value) {
    return
  }
  selectedValue.value = value
}

function isSelected(value: string): boolean {
  return selectedValue.value === value
}

function isItemDisabled(value: string): boolean {
  void value
  return groupDisabled.value
}

provide(ghostDropdownMenuRadioGroupContextKey, {
  selectedValue,
  disabled: groupDisabled,
  select,
  isSelected,
  isItemDisabled,
})

const attrs = useAttrs()

const groupAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  return {
    ...rest,
    role: 'group',
    'data-part': 'radio-group',
    'aria-disabled': props.disabled ? 'true' : undefined,
  }
})
</script>

<template>
  <component :is="props.as" v-bind="groupAttrs">
    <slot />
  </component>
</template>
