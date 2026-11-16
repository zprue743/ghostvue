import {
  computed,
  nextTick,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import type {
  GhostComboboxFormInputProps,
  GhostComboboxLiveRegionProps,
  GhostComboboxOptionRecord,
  GhostComboboxSearchPayload,
  GhostComboboxValue,
  UseGhostComboboxOptions,
} from './ghost-combobox'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

/** Neutral root class hook (themed recipes may target). */
export interface GhostComboboxRootProps {
  class?: string
}

/**
 * Selected value, search query, option registry, listbox open state, highlight,
 * and form hidden-input props for {@link GhostCombobox}.
 */
export function useGhostCombobox(options: UseGhostComboboxOptions = {}): {
  multiple: ComputedRef<boolean>
  virtualized: ComputedRef<boolean>
  selectedValue: Ref<GhostComboboxValue>
  searchValue: Ref<string>
  isOpen: Ref<boolean>
  loading: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggleOpen: () => void
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  allowDeselect: ComputedRef<boolean>
  placeholder: ComputedRef<string | undefined>
  defaultInputId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  optionOrder: ComputedRef<string[]>
  optionCount: ComputedRef<number>
  registerOption: GhostComboboxRegisterOption
  unregisterOption: (value: string) => void
  setOptionDisabled: (value: string, disabled: boolean) => void
  setOptionTextValue: (value: string, textValue: string) => void
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isOptionDisabled: (value: string) => boolean
  getOptionText: (value: string) => string | undefined
  getOptionId: (value: string) => string | undefined
  activeOptionValue: Ref<string | undefined>
  activeDescendantId: ComputedRef<string | undefined>
  moveActive: (direction: 1 | -1) => void
  setActiveOptionByValue: (value: string | undefined) => void
  moveActiveFirst: () => void
  moveActiveLast: () => void
  onInputSearch: (query: string) => void
  formMirrorInputs: ComputedRef<GhostComboboxFormInputProps[]>
  applyFormReset: () => void
  syncFormValidity: () => void
  handleFormInputInvalid: () => void
  labelVersion: Ref<number>
  announceMessage: Ref<string>
  liveRegionId: ComputedRef<string>
  liveRegionProps: ComputedRef<GhostComboboxLiveRegionProps>
} {
  let suppressValueChange = false

  const multiple = computed(() => Boolean(toValue(options.multiple)))
  const virtualized = computed(() => Boolean(toValue(options.virtualized)))
  const loading = computed(() => Boolean(toValue(options.loading)))
  const allowDeselect = computed(() => Boolean(toValue(options.allowDeselect)))

  const selectedValue = useControllableState<GhostComboboxValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: () =>
      toValue(options.defaultValue) ??
      (multiple.value ? ([] as string[]) : undefined),
    onChange: (next) => {
      if (suppressValueChange) {
        return
      }
      options.onValueChange?.(next)
    },
  })

  const searchValue = useControllableState<string>({
    prop: () => toValue(options.search),
    defaultValue: () => toValue(options.defaultSearch) ?? '',
    onChange: (next) => {
      options.onSearchChange?.(next)
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

  const defaultInputId = useGhostId('ghost-combobox-input')
  const defaultContentId = useGhostId('ghost-combobox-content')
  const liveRegionId = useGhostId('ghost-combobox-announcer')

  const optionOrder = shallowRef<string[]>([])
  const optionRegistry = shallowRef(
    new Map<string, GhostComboboxOptionRecord>(),
  )
  const optionLabels = shallowRef(new Map<string, string>())
  const registryVersion = shallowRef(0)
  const labelVersion = shallowRef(0)
  const activeOptionValue = shallowRef<string | undefined>(undefined)
  const announceMessage = shallowRef('')
  const announcedLoading = shallowRef(false)

  let searchRequestId = 0

  function bumpRegistry(): void {
    optionRegistry.value = new Map(optionRegistry.value)
    registryVersion.value += 1
    queueAnnouncement()
  }

  function enabledOptionsInOrder(): GhostComboboxOptionRecord[] {
    void registryVersion.value
    return optionOrder.value
      .map((value) => optionRegistry.value.get(value))
      .filter(
        (entry): entry is GhostComboboxOptionRecord => entry !== undefined,
      )
      .filter((entry) => !isOptionDisabled(entry.value))
  }

  function queueAnnouncement(): void {
    if (!isOpen.value) {
      return
    }
    if (loading.value) {
      if (announcedLoading.value) {
        return
      }
      announcedLoading.value = true
      announceMessage.value = 'Loading results'
      return
    }
    announcedLoading.value = false
    const count = enabledOptionsInOrder().length
    announceMessage.value =
      count === 0
        ? 'No results available'
        : `${String(count)} results available`
  }

  watch(
    loading,
    (isLoading) => {
      if (!isLoading) {
        announcedLoading.value = false
      }
      queueAnnouncement()
    },
    { immediate: true },
  )

  watch(
    isOpen,
    (open) => {
      if (open) {
        queueAnnouncement()
        return
      }
      activeOptionValue.value = undefined
      announceMessage.value = ''
      announcedLoading.value = false
    },
    { immediate: true },
  )

  function registerOption(
    value: string,
    textValue: string,
    optionDisabled: boolean,
    optionId: string,
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
      optionId,
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

  function unregisterOption(value: string): void {
    optionOrder.value = optionOrder.value.filter((entry) => entry !== value)
    optionRegistry.value.delete(value)
    if (activeOptionValue.value === value) {
      activeOptionValue.value = undefined
    }
    bumpRegistry()
    normalizeSelectionAfterUnregister(value)
  }

  function normalizeSelectionAfterUnregister(removed: string): void {
    if (multiple.value) {
      const current = selectedArray()
      if (!current.includes(removed)) {
        return
      }
      const controlled = toValue(options.modelValue) !== undefined
      if (!controlled) {
        suppressValueChange = true
        selectedValue.value = current.filter((v) => v !== removed)
        suppressValueChange = false
      } else {
        void nextTick(() => {
          /* parent owns controlled value when option unmounts */
        })
      }
      return
    }
    if (selectedValue.value !== removed) {
      return
    }
    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) {
      suppressValueChange = true
      selectedValue.value = undefined
      suppressValueChange = false
      return
    }
    void nextTick(() => {
      /* parent owns controlled value */
    })
  }

  function selectedArray(): string[] {
    if (multiple.value) {
      const v = selectedValue.value
      return Array.isArray(v) ? [...v] : []
    }
    const single = selectedValue.value
    return typeof single === 'string' ? [single] : []
  }

  function isOptionDisabled(value: string): boolean {
    return disabled.value || Boolean(optionRegistry.value.get(value)?.disabled)
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

  function isSelected(value: string): boolean {
    if (multiple.value) {
      return selectedArray().includes(value)
    }
    return selectedValue.value === value
  }

  function select(value: string): void {
    if (isOptionDisabled(value)) {
      return
    }
    if (multiple.value) {
      const current = selectedArray()
      const index = current.indexOf(value)
      if (index >= 0) {
        selectedValue.value = current.filter((v) => v !== value)
      } else {
        selectedValue.value = [...current, value]
      }
      return
    }
    if (allowDeselect.value && selectedValue.value === value && isOpen.value) {
      selectedValue.value = undefined
      close()
      return
    }
    selectedValue.value = value
    searchValue.value = getOptionText(value) ?? searchValue.value
    close()
  }

  function getOptionText(value: string): string | undefined {
    return (
      optionRegistry.value.get(value)?.textValue ??
      optionLabels.value.get(value)
    )
  }

  function getOptionId(value: string): string | undefined {
    return optionRegistry.value.get(value)?.optionId
  }

  const activeDescendantId = computed(() => {
    void registryVersion.value
    const active = activeOptionValue.value
    if (!active) {
      return undefined
    }
    return getOptionId(active)
  })

  function moveActive(direction: 1 | -1): void {
    const enabled = enabledOptionsInOrder()
    if (enabled.length === 0) {
      activeOptionValue.value = undefined
      return
    }
    const current = activeOptionValue.value
    let index = current
      ? enabled.findIndex((e) => e.value === current)
      : direction === 1
        ? -1
        : enabled.length
    if (index < 0) {
      index = direction === 1 ? -1 : enabled.length
    }
    let next = index + direction
    if (next < 0) {
      next = enabled.length - 1
    } else if (next >= enabled.length) {
      next = 0
    }
    const target = enabled[next]
    activeOptionValue.value = target?.value
  }

  function setActiveOptionByValue(value: string | undefined): void {
    if (value === undefined) {
      activeOptionValue.value = undefined
      return
    }
    if (isOptionDisabled(value)) {
      return
    }
    activeOptionValue.value = value
  }

  function moveActiveFirst(): void {
    const enabled = enabledOptionsInOrder()
    activeOptionValue.value = enabled[0]?.value
  }

  function moveActiveLast(): void {
    const enabled = enabledOptionsInOrder()
    activeOptionValue.value = enabled[enabled.length - 1]?.value
  }

  function emitSearch(query: string): void {
    searchRequestId += 1
    const payload: GhostComboboxSearchPayload = {
      query,
      requestId: searchRequestId,
    }
    options.onSearch?.(payload)
  }

  function onInputSearch(query: string): void {
    searchValue.value = query
    emitSearch(query)
    if (!isOpen.value) {
      open()
    }
    queueAnnouncement()
  }

  const formMirrorInputs = computed((): GhostComboboxFormInputProps[] => {
    const name = toValue(options.name)
    const form = toValue(options.form)
    if (!name) {
      return []
    }
    const base = {
      type: 'text' as const,
      form: form ?? undefined,
      disabled: disabled.value || undefined,
      tabindex: -1 as const,
      'aria-hidden': true as const,
      class: 'ghost-visually-hidden' as const,
      style: visuallyHiddenStyle,
      autocomplete: 'off' as const,
    }
    if (multiple.value) {
      const values = selectedArray()
      if (values.length === 0) {
        return [
          {
            ...base,
            name,
            value: '',
            required: required.value ? true : undefined,
          },
        ]
      }
      return values.map((value, index) => ({
        ...base,
        name,
        value,
        required: index === 0 && required.value ? true : undefined,
      }))
    }
    const value =
      typeof selectedValue.value === 'string' ? selectedValue.value : ''
    return [
      {
        ...base,
        name,
        value,
        required: required.value ? true : undefined,
      },
    ]
  })

  function applyFormReset(): void {
    selectedValue.value =
      toValue(options.defaultValue) ??
      (multiple.value ? ([] as string[]) : undefined)
    searchValue.value = toValue(options.defaultSearch) ?? ''
  }

  function syncFormValidity(): void {
    const el = options.getFormInput?.() ?? null
    if (!el) {
      return
    }
    const empty = multiple.value
      ? selectedArray().length === 0
      : selectedValue.value === undefined || selectedValue.value === ''
    if (required.value && empty) {
      el.setCustomValidity('Select a value.')
    } else {
      el.setCustomValidity('')
      constraintInvalid.value = false
    }
  }

  function handleFormInputInvalid(): void {
    constraintInvalid.value = true
  }

  watch([selectedValue, required, () => multiple.value], () => {
    syncFormValidity()
  })

  const liveRegionProps = computed((): GhostComboboxLiveRegionProps => ({
    id: liveRegionId.value,
    class: 'ghost-visually-hidden',
    style: visuallyHiddenStyle,
    'aria-live': 'polite',
    'aria-atomic': true,
    'data-part': 'announcer',
  }))

  return {
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
    required,
    invalid,
    allowDeselect,
    placeholder,
    defaultInputId,
    defaultContentId,
    optionOrder: computed(() => {
      void registryVersion.value
      return [...optionOrder.value]
    }),
    optionCount: computed(() => {
      void registryVersion.value
      return optionOrder.value.length
    }),
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
    formMirrorInputs,
    applyFormReset,
    syncFormValidity,
    handleFormInputInvalid,
    labelVersion,
    announceMessage,
    liveRegionId,
    liveRegionProps,
  }
}

type GhostComboboxRegisterOption = (
  value: string,
  textValue: string,
  disabled: boolean,
  optionId: string,
  getElement: () => HTMLElement | null,
) => void

/**
 * Tracks the latest `search` event `requestId` from {@link GhostCombobox} so
 * async handlers can ignore stale responses without a second id source.
 */
export function useGhostComboboxAsyncSearch(): {
  begin: (requestId: number) => void
  isLatest: (requestId: number) => boolean
} {
  let latest = 0
  return {
    begin(requestId: number) {
      latest = requestId
    },
    isLatest(requestId: number) {
      return requestId === latest
    },
  }
}
