<script setup lang="ts">
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'

import { ghostSelectContextKey, type GhostSelectMessages } from './ghost-select'
import { useNativeFormReset } from './form-reset'
import { useGhostSelect } from './use-ghost-select'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | undefined
    defaultValue?: string | undefined
    name?: string | undefined
    form?: string | undefined
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    open?: boolean | undefined
    defaultOpen?: boolean
    placeholder?: string | undefined
    messages?: GhostSelectMessages | undefined
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    name: undefined,
    form: undefined,
    disabled: false,
    required: false,
    invalid: false,
    open: undefined,
    defaultOpen: false,
    placeholder: undefined,
    messages: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'update:open': [open: boolean]
}>()

const formInput = useTemplateRef<HTMLInputElement>('formInput')
const triggerElement = shallowRef<HTMLElement | null>(null)

const {
  selectedValue,
  isOpen,
  open,
  close,
  triggerId: defaultTriggerId,
  contentId: defaultContentId,
  disabled,
  required: isRequired,
  invalid: isInvalid,
  placeholder,
  optionOrder,
  registerOption,
  unregisterOption,
  setOptionDisabled,
  setOptionTextValue,
  select,
  isSelected,
  isOptionDisabled,
  getOptionText,
  handleTypeahead,
  focusOptionByValue,
  focusFirstEnabledOption,
  formInputProps,
  applyFormReset,
  syncFormValidity,
  handleFormInputInvalid,
  labelVersion,
} = useGhostSelect({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  disabled: () => props.disabled,
  required: () => props.required,
  invalid: () => props.invalid,
  name: () => props.name,
  form: () => props.form,
  placeholder: () => props.placeholder,
  messages: () => props.messages,
  onValueChange: (value) => {
    emit('update:modelValue', value)
  },
  onOpenChange: (next) => {
    emit('update:open', next)
  },
  getFormInput: () => formInput.value,
})

useNativeFormReset(
  () => formInput.value ?? triggerElement.value,
  applyFormReset,
)

const openedAtMount = shallowRef(isOpen.value)
watch(isOpen, (next) => {
  if (!next) {
    openedAtMount.value = false
  }
})

watch(
  () => formInput.value,
  (el) => {
    if (el) {
      syncFormValidity()
    }
  },
  { flush: 'post', immediate: true },
)

function onFormInputInvalid(event: Event): void {
  handleFormInputInvalid()
  triggerElement.value?.focus()
  if (event.cancelable) {
    event.preventDefault()
  }
}

const customTriggerId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const triggerRegistered = shallowRef(false)
const contentElement = shallowRef<HTMLElement | null>(null)
const openFocusFromEnd = shallowRef(false)

provide(ghostSelectContextKey, {
  openFocusFromEnd,
  selectedValue,
  isOpen,
  open,
  close,
  disabled,
  required: isRequired,
  invalid: isInvalid,
  placeholder,
  defaultTriggerId,
  defaultContentId,
  triggerId: computed(() => customTriggerId.value ?? defaultTriggerId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  triggerElement,
  contentElement,
  triggerRegistered,
  openedAtMount,
  setTriggerElement(element) {
    triggerElement.value = element
  },
  setContentElement(element) {
    contentElement.value = element
  },
  setTriggerId(id) {
    customTriggerId.value = id
  },
  setContentId(id) {
    customContentId.value = id
  },
  setTriggerRegistered(registered) {
    triggerRegistered.value = registered
  },
  registerOption,
  unregisterOption,
  setOptionDisabled,
  setOptionTextValue,
  select,
  isSelected,
  isOptionDisabled,
  optionOrder,
  getOptionText,
  handleTypeahead,
  focusOptionByValue,
  focusFirstEnabledOption,
  labelVersion,
})

defineExpose({
  get element() {
    return formInput.value ?? triggerElement.value
  },
  focus(options?: FocusOptions) {
    triggerElement.value?.focus(options)
  },
  blur() {
    triggerElement.value?.blur()
  },
})
</script>

<template>
  <slot />
  <input
    v-if="formInputProps.name !== undefined"
    ref="formInput"
    v-bind="formInputProps"
    @keydown.prevent
    @beforeinput.prevent
    @paste.prevent
    @invalid="onFormInputInvalid"
  />
</template>
