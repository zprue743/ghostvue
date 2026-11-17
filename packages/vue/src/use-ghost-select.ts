import {
  computed,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type CSSProperties,
  type Ref,
} from 'vue'

import type {
  GhostSelectOptionRecord,
  UseGhostSelectOptions,
} from './ghost-select'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

const TYPEAHEAD_MS = 500

/** Native submit + `required` constraint validation (not `type=hidden`). */
export interface GhostSelectFormInputProps {
  type: 'text'
  name: string | undefined
  value: string
  form: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  tabindex: -1
  'aria-hidden': true
  class: 'ghost-visually-hidden'
  style: CSSProperties
  autocomplete: 'off'
}

/**
 * Selected value, option registry, listbox open state, typeahead, and form
 * hidden-input props for {@link GhostSelect}.
 */
export function useGhostSelect(options: UseGhostSelectOptions = {}): {
  labelVersion: Ref<number>
  selectedValue: Ref<string | undefined>
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggleOpen: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  placeholder: ComputedRef<string | undefined>
  optionOrder: ComputedRef<string[]>
  registerOption: GhostSelectContextRegisterOption
  unregisterOption: (value: string) => void
  setOptionDisabled: (value: string, disabled: boolean) => void
  setOptionTextValue: (value: string, textValue: string) => void
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isOptionDisabled: (value: string) => boolean
  getOptionText: (value: string) => string | undefined
  handleTypeahead: (event: KeyboardEvent) => void
  focusOptionByValue: (value: string) => void
  focusFirstEnabledOption: (fromEnd?: boolean) => void
  formInputProps: ComputedRef<GhostSelectFormInputProps>
  applyFormReset: () => void
  syncFormValidity: () => void
  handleFormInputInvalid: () => void
} {
  const selectedValue = useControllableState<string | undefined>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const disabled = computed(() => Boolean(toValue(options.disabled)))
  const required = computed(() => Boolean(toValue(options.required)))
  const constraintInvalid = shallowRef(false)
  const invalid = computed(
    () => Boolean(toValue(options.invalid)) || constraintInvalid.value,
  )
  const placeholder = computed(() => toValue(options.placeholder))

  const triggerId = useGhostId('ghost-select-trigger')
  const contentId = useGhostId('ghost-select-content')

  const optionOrder = shallowRef<string[]>([])
  const optionRegistry = shallowRef(new Map<string, GhostSelectOptionRecord>())
  const optionLabels = shallowRef(new Map<string, string>())
  const registryVersion = shallowRef(0)
  const labelVersion = shallowRef(0)

  let typeaheadString = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined
  let typeaheadMatchIndex = 0

  function bumpRegistry(): void {
    optionRegistry.value = new Map(optionRegistry.value)
    registryVersion.value += 1
  }

  function registerOption(
    value: string,
    textValue: string,
    optionDisabled: boolean,
    getElement: () => HTMLElement | null,
  ): void {
    const nextOrder = [...optionOrder.value]
    if (!nextOrder.includes(value)) {
      nextOrder.push(value)
      optionOrder.value = nextOrder
    }
    optionLabels.value = new Map(optionLabels.value).set(value, textValue)
    labelVersion.value += 1
    optionRegistry.value.set(value, {
      value,
      textValue,
      disabled: optionDisabled,
      getElement,
    })
    bumpRegistry()
  }

  function setOptionDisabled(value: string, optionDisabled: boolean): void {
    const record = optionRegistry.value.get(value)
    if (!record || record.disabled === optionDisabled) {
      return
    }
    optionRegistry.value.set(value, { ...record, disabled: optionDisabled })
    bumpRegistry()
  }

  function setOptionTextValue(value: string, textValue: string): void {
    const record = optionRegistry.value.get(value)
    if (!record || record.textValue === textValue) {
      return
    }
    optionLabels.value = new Map(optionLabels.value).set(value, textValue)
    labelVersion.value += 1
    optionRegistry.value.set(value, { ...record, textValue })
    bumpRegistry()
  }

  /**
   * Removes an option from the live registry (keyboard focus, typeahead)
   * without touching the selection. Conditional or filtered option lists
   * unmount options routinely; the selected value and its cached label in
   * `optionLabels` must survive so form data and `GhostSelectValue` never
   * change without a user action or an `update:modelValue` event. Only user
   * selection, native form reset, or the parent's controlled value change it.
   */
  function unregisterOption(value: string): void {
    optionOrder.value = optionOrder.value.filter((entry) => entry !== value)
    optionRegistry.value.delete(value)
    bumpRegistry()
  }

  function isOptionDisabled(value: string): boolean {
    return disabled.value || Boolean(optionRegistry.value.get(value)?.disabled)
  }

  function enabledOptionsInOrder(): GhostSelectOptionRecord[] {
    void registryVersion.value
    return optionOrder.value
      .map((value) => optionRegistry.value.get(value))
      .filter((entry): entry is GhostSelectOptionRecord => entry !== undefined)
      .filter((entry) => !isOptionDisabled(entry.value))
  }

  function focusElement(element: HTMLElement | null | undefined): void {
    element?.focus({ preventScroll: true })
  }

  function focusOptionByValue(value: string): void {
    const record = optionRegistry.value.get(value)
    if (!record || isOptionDisabled(value)) {
      return
    }
    focusElement(record.getElement())
  }

  function focusFirstEnabledOption(fromEnd = false): void {
    const enabled = enabledOptionsInOrder()
    if (enabled.length === 0) {
      return
    }
    const target = fromEnd ? enabled[enabled.length - 1] : enabled[0]
    if (target) {
      focusOptionByValue(target.value)
    }
  }

  function open(): void {
    if (disabled.value || isOpen.value) {
      return
    }
    isOpen.value = true
  }

  function close(): void {
    if (!isOpen.value) {
      return
    }
    isOpen.value = false
  }

  function toggleOpen(): void {
    if (disabled.value) {
      return
    }
    isOpen.value = !isOpen.value
  }

  function select(value: string): void {
    if (isOptionDisabled(value)) {
      return
    }
    selectedValue.value = value
    close()
  }

  function isSelected(value: string): boolean {
    return selectedValue.value === value
  }

  function getOptionText(value: string): string | undefined {
    return (
      optionRegistry.value.get(value)?.textValue ??
      optionLabels.value.get(value)
    )
  }

  function handleTypeahead(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return
    }
    if (event.key.length !== 1) {
      return
    }

    const searchBase = typeaheadString + event.key
    const search = searchBase.toLowerCase()
    const enabled = enabledOptionsInOrder()
    const matches = enabled.filter((entry) =>
      entry.textValue.toLowerCase().startsWith(search),
    )
    if (matches.length === 0) {
      return
    }

    event.preventDefault()
    if (typeaheadString !== searchBase.slice(0, -1)) {
      typeaheadMatchIndex = 0
    }
    if (
      typeaheadString.length > 0 &&
      searchBase.startsWith(typeaheadString) &&
      matches.length > 1
    ) {
      typeaheadMatchIndex = (typeaheadMatchIndex + 1) % matches.length
    } else {
      typeaheadMatchIndex = 0
    }
    typeaheadString = searchBase
    globalThis.clearTimeout(typeaheadTimer)
    typeaheadTimer = globalThis.setTimeout(() => {
      typeaheadString = ''
      typeaheadMatchIndex = 0
    }, TYPEAHEAD_MS)

    const match = matches[typeaheadMatchIndex]
    if (match) {
      focusOptionByValue(match.value)
    }
  }

  const formInputProps = computed((): GhostSelectFormInputProps => {
    const name = toValue(options.name)
    const form = toValue(options.form)
    const value = selectedValue.value ?? ''
    const named = Boolean(name)
    return {
      type: 'text',
      name: named ? name : undefined,
      value,
      form: form ?? undefined,
      disabled: disabled.value || undefined,
      required: named && required.value ? true : undefined,
      tabindex: -1,
      'aria-hidden': true,
      class: 'ghost-visually-hidden',
      style: visuallyHiddenStyle,
      autocomplete: 'off',
    }
  })

  function applyFormReset(): void {
    selectedValue.value = toValue(options.defaultValue)
  }

  function syncFormValidity(): void {
    const el = options.getFormInput?.() ?? null
    if (!el) {
      return
    }
    const empty =
      selectedValue.value === undefined || selectedValue.value === ''
    if (required.value && empty) {
      el.setCustomValidity('Select a value.')
    } else {
      el.setCustomValidity('')
      constraintInvalid.value = false
    }
  }

  /** Native `invalid` on the mirror input — surfacing invalid state on the trigger. */
  function handleFormInputInvalid(): void {
    constraintInvalid.value = true
  }

  watch([selectedValue, required], () => {
    syncFormValidity()
  })

  return {
    selectedValue,
    isOpen,
    open,
    close,
    toggleOpen,
    triggerId,
    contentId,
    disabled,
    required,
    invalid,
    placeholder,
    optionOrder: computed(() => {
      void registryVersion.value
      return [...optionOrder.value]
    }),
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
  }
}

type GhostSelectContextRegisterOption = (
  value: string,
  textValue: string,
  disabled: boolean,
  getElement: () => HTMLElement | null,
) => void
