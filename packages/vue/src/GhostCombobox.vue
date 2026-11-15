<script setup lang="ts">
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'

import { ghostComboboxContextKey, type GhostComboboxExposed, type GhostComboboxValue } from './ghost-combobox'
import { useNativeFormReset } from './form-reset'
import { useGhostCombobox } from './use-ghost-combobox'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: GhostComboboxValue
    defaultValue?: GhostComboboxValue
    multiple?: boolean
    virtualized?: boolean
    search?: string | undefined
    defaultSearch?: string
    name?: string | undefined
    form?: string | undefined
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    loading?: boolean
    allowDeselect?: boolean
    open?: boolean | undefined
    defaultOpen?: boolean
    placeholder?: string | undefined
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    multiple: false,
    virtualized: false,
    search: undefined,
    defaultSearch: '',
    name: undefined,
    form: undefined,
    disabled: false,
    required: false,
    invalid: false,
    loading: false,
    allowDeselect: false,
    open: undefined,
    defaultOpen: false,
    placeholder: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: GhostComboboxValue]
  'update:search': [value: string]
  'update:open': [open: boolean]
  search: [payload: { query: string; requestId: number }]
}>()

const formInput = useTemplateRef<HTMLInputElement>('formInput')
const inputElement = shallowRef<HTMLElement | null>(null)

const combobox = useGhostCombobox({
  multiple: () => props.multiple,
  virtualized: () => props.virtualized,
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  search: () => props.search,
  defaultSearch: () => props.defaultSearch,
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  disabled: () => props.disabled,
  required: () => props.required,
  invalid: () => props.invalid,
  loading: () => props.loading,
  allowDeselect: () => props.allowDeselect,
  name: () => props.name,
  form: () => props.form,
  placeholder: () => props.placeholder,
  onValueChange: (value) => {
    emit('update:modelValue', value)
  },
  onSearchChange: (query) => {
    emit('update:search', query)
  },
  onSearch: (payload) => {
    emit('search', payload)
  },
  onOpenChange: (next) => {
    emit('update:open', next)
  },
  getFormInput: () => formInput.value,
})

const {
  multiple,
  virtualized,
  selectedValue,
  searchValue,
  isOpen,
  loading,
  open,
  close,
  toggleOpen,
  disabled,
  required: isRequired,
  invalid: isInvalid,
  allowDeselect,
  placeholder,
  defaultInputId,
  defaultContentId,
  optionOrder,
  optionCount,
  registerOption,
  unregisterOption,
  setOptionDisabled,
  setOptionTextValue,
  select,
  isSelected,
  isOptionDisabled,
  getOptionText,
  getOptionId,
  activeOptionValue,
  activeDescendantId,
  moveActive,
  setActiveOptionByValue,
  moveActiveFirst,
  moveActiveLast,
  onInputSearch,
  formInputProps,
  applyFormReset,
  syncFormValidity,
  handleFormInputInvalid,
  labelVersion,
  announceMessage,
  liveRegionId,
} = combobox

useNativeFormReset(
  () => formInput.value ?? inputElement.value,
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
  inputElement.value?.focus()
  if (event.cancelable) {
    event.preventDefault()
  }
}

const customInputId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const inputRegistered = shallowRef(false)
const contentElement = shallowRef<HTMLElement | null>(null)
const listboxElement = shallowRef<HTMLElement | null>(null)

provide(ghostComboboxContextKey, {
  multiple,
  virtualized,
  selectedValue,
  searchValue,
  isOpen,
  loading,
  open,
  close,
  toggleOpen,
  disabled,
  required: isRequired,
  invalid: isInvalid,
  allowDeselect,
  placeholder,
  defaultInputId,
  defaultContentId,
  inputId: computed(() => customInputId.value ?? defaultInputId.value),
  contentId: computed(() => customContentId.value ?? defaultContentId.value),
  inputElement,
  contentElement,
  listboxElement,
  openedAtMount,
  inputRegistered,
  setInputElement(element) {
    inputElement.value = element
  },
  setContentElement(element) {
    contentElement.value = element
  },
  setListboxElement(element) {
    listboxElement.value = element
  },
  setInputId(id) {
    customInputId.value = id
  },
  setContentId(id) {
    customContentId.value = id
  },
  setInputRegistered(registered) {
    inputRegistered.value = registered
  },
  registerOption,
  unregisterOption,
  setOptionDisabled,
  setOptionTextValue,
  select,
  isSelected,
  isOptionDisabled,
  optionOrder,
  optionCount,
  getOptionText,
  getOptionId,
  activeOptionValue,
  activeDescendantId,
  moveActive,
  setActiveOptionByValue,
  moveActiveFirst,
  moveActiveLast,
  onInputSearch,
  labelVersion,
  announceMessage,
  liveRegionId,
})

defineExpose<GhostComboboxExposed>({
  get element() {
    return inputElement.value ?? formInput.value
  },
  focus(options?: FocusOptions) {
    inputElement.value?.focus(options)
  },
  blur() {
    inputElement.value?.blur()
  },
})
</script>

<template>
  <slot />
  <div
    :id="liveRegionId"
    class="ghost-visually-hidden"
    aria-live="polite"
    aria-atomic="true"
    data-part="announcer"
  >
    {{ announceMessage }}
  </div>
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