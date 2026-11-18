<script setup lang="ts">
import {
  computed,
  nextTick,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type ComponentPublicInstance,
} from 'vue'

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

const primaryFormMirror = shallowRef<HTMLInputElement | null>(null)
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
  getFormInput: () => primaryFormMirror.value,
})

const { liveRegionProps, announceMessage, formMirrorInputs } = combobox

useNativeFormReset(
  () => primaryFormMirror.value ?? inputElement.value,
  combobox.applyFormReset,
)

const openedAtMount = shallowRef(combobox.isOpen.value)
watch(combobox.isOpen, (next) => {
  if (!next) {
    openedAtMount.value = false
  }
})

watch(
  () => primaryFormMirror.value,
  (el) => {
    if (el) {
      combobox.syncFormValidity()
    }
  },
  { flush: 'post', immediate: true },
)

watch(
  () => formMirrorInputs.value,
  () => {
    void Promise.resolve().then(() => {
      if (primaryFormMirror.value) {
        combobox.syncFormValidity()
      }
    })
  },
  { deep: true },
)

function onFormInputInvalid(event: Event): void {
  combobox.handleFormInputInvalid()
  inputElement.value?.focus()
  if (event.cancelable) {
    event.preventDefault()
  }
}

function setPrimaryFormMirror(
  el: Element | ComponentPublicInstance | null,
  index: number,
): void {
  if (index !== 0) {
    return
  }
  primaryFormMirror.value = el instanceof HTMLInputElement ? el : null
}

const customInputId = shallowRef<string | null>(null)
const customContentId = shallowRef<string | null>(null)
const inputRegistered = shallowRef(false)
const contentElement = shallowRef<HTMLElement | null>(null)
const listboxElement = shallowRef<HTMLElement | null>(null)

const triggerElement = shallowRef<HTMLElement | null>(null)
const focusRestoreSuppressed = shallowRef(false)

/*
 * Focus departure (GHO-166). The root renders no wrapper element and the
 * content may be portaled, so `focusout` from each part is checked against
 * every part instead of one container. Pointer presses are tracked separately:
 * pressing non-focusable content (padding, a group label) or a trigger in a
 * browser that does not focus buttons moves focus to `body` or to the nearest
 * focusable ancestor, which must not read as the user leaving the widget.
 * Presses outside the widget are owned by the content's dismissable layer.
 */
let pointerDownInside = false
let pointerListenersAttached = false

function isInsideWidget(node: unknown): boolean {
  if (!(node instanceof Node)) {
    return false
  }
  return [inputElement.value, triggerElement.value, contentElement.value].some(
    (element) => element?.contains(node) ?? false,
  )
}

function clearPointerDownInside(): void {
  pointerDownInside = false
  if (!pointerListenersAttached) {
    return
  }
  // Touch dispatches the focus-moving compatibility mousedown after
  // pointerup, so the press is considered finished only at click, cancel,
  // the next press, or the next key press.
  document.removeEventListener('click', clearPointerDownInside, true)
  document.removeEventListener('pointercancel', clearPointerDownInside, true)
  document.removeEventListener('pointerdown', clearPointerDownInside, true)
  document.removeEventListener('keydown', clearPointerDownInside, true)
  pointerListenersAttached = false
}

function notifyPointerDownInside(): void {
  if (!pointerListenersAttached) {
    // Attached from inside the current pointerdown's target phase, so the
    // capture-phase pointerdown listener only sees the next press.
    document.addEventListener('click', clearPointerDownInside, true)
    document.addEventListener('pointercancel', clearPointerDownInside, true)
    document.addEventListener('pointerdown', clearPointerDownInside, true)
    document.addEventListener('keydown', clearPointerDownInside, true)
    pointerListenersAttached = true
  }
  pointerDownInside = true
}

function dismissOnFocusLeave(): void {
  const wasOpen = combobox.isOpen.value
  if (wasOpen) {
    // The user chose where focus goes; the content's focus scope must not
    // restore it to the input when the listbox unmounts its layer.
    focusRestoreSuppressed.value = true
  }
  combobox.dismissOnFocusLeave()
  if (wasOpen) {
    void nextTick(() => {
      // A controlled parent that rejected `update:open` keeps the list open;
      // later closes (Escape, outside press) restore focus as usual.
      if (combobox.isOpen.value) {
        focusRestoreSuppressed.value = false
      }
    })
  }
}

function notifyFocusOut(event: FocusEvent): void {
  if (combobox.disabled.value) {
    return
  }
  // A press that started inside the widget can move focus to `body` or to a
  // focusable ancestor (a `tabindex="-1"` landmark, for example). Either way
  // the user is still interacting with the widget.
  if (pointerDownInside) {
    return
  }
  const next = event.relatedTarget
  if (next !== null) {
    if (!isInsideWidget(next)) {
      dismissOnFocusLeave()
    }
    return
  }
  // A null `relatedTarget` is either `blur()` / focus moving to `body`, or
  // the window losing focus. Wait for focus to settle: when the window blurs,
  // `document.activeElement` stays on the widget and the list stays open.
  queueMicrotask(() => {
    if (pointerDownInside || isInsideWidget(document.activeElement)) {
      return
    }
    dismissOnFocusLeave()
  })
}

watch(combobox.isOpen, (open) => {
  if (open) {
    focusRestoreSuppressed.value = false
  }
})

onUnmounted(() => {
  clearPointerDownInside()
})

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
  triggerElement,
  setTriggerElement(element) {
    triggerElement.value = element
  },
  notifyFocusOut,
  notifyPointerDownInside,
  focusRestoreSuppressed,
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
    return inputElement.value ?? primaryFormMirror.value
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
  <div v-bind="liveRegionProps">
    {{ announceMessage }}
  </div>
  <input
    v-for="(mirror, index) in formMirrorInputs"
    :key="`${mirror.name}-${mirror.value}-${index}`"
    :ref="(el) => setPrimaryFormMirror(el, index)"
    v-bind="mirror"
    @keydown.prevent
    @beforeinput.prevent
    @paste.prevent
    @invalid="onFormInputInvalid"
  />
</template>
