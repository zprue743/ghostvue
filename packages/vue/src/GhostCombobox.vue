<script setup lang="ts">
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'

import {
  ghostComboboxContextKey,
  type GhostComboboxExposed,
  type GhostComboboxValue,
} from './ghost-combobox'
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

const { liveRegionId, announceMessage, formInputProps } = combobox

useNativeFormReset(
  () => formInput.value ?? inputElement.value,
  combobox.applyFormReset,
)

const openedAtMount = shallowRef(combobox.isOpen.value)
watch(combobox.isOpen, (next) => {
  if (!next) {
    openedAtMount.value = false
  }
})

watch(
  () => formInput.value,
  (el) => {
    if (el) {
      combobox.syncFormValidity()
    }
  },
  { flush: 'post', immediate: true },
)

function onFormInputInvalid(event: Event): void {
  combobox.handleFormInputInvalid()
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
  multiple: combobox.multiple,
  virtualized: combobox.virtualized,
  selectedValue: combobox.selectedValue,
  searchValue: combobox.searchValue,
  isOpen: combobox.isOpen,
  loading: combobox.loading,
  open: combobox.open,
  close: combobox.close,
  toggleOpen: combobox.toggleOpen,
  disabled: combobox.disabled,
  required: combobox.required,
  invalid: combobox.invalid,
  allowDeselect: combobox.allowDeselect,
  placeholder: combobox.placeholder,
  defaultInputId: combobox.defaultInputId,
  defaultContentId: combobox.defaultContentId,
  inputId: computed(() => customInputId.value ?? combobox.defaultInputId.value),
  contentId: computed(
    () => customContentId.value ?? combobox.defaultContentId.value,
  ),
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
  registerOption: combobox.registerOption,
  unregisterOption: combobox.unregisterOption,
  setOptionDisabled: combobox.setOptionDisabled,
  setOptionTextValue: combobox.setOptionTextValue,
  select: combobox.select,
  isSelected: combobox.isSelected,
  isOptionDisabled: combobox.isOptionDisabled,
  optionOrder: combobox.optionOrder,
  optionCount: combobox.optionCount,
  getOptionText: combobox.getOptionText,
  getOptionId: combobox.getOptionId,
  activeOptionValue: combobox.activeOptionValue,
  activeDescendantId: combobox.activeDescendantId,
  moveActive: combobox.moveActive,
  setActiveOptionByValue: combobox.setActiveOptionByValue,
  moveActiveFirst: combobox.moveActiveFirst,
  moveActiveLast: combobox.moveActiveLast,
  onInputSearch: combobox.onInputSearch,
  labelVersion: combobox.labelVersion,
  announceMessage: combobox.announceMessage,
  liveRegionId: combobox.liveRegionId,
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
