import {
  computed,
  shallowReactive,
  shallowRef,
  toRaw,
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
import { isImeComposing } from './is-ime-composing'
import { sortByDocumentOrder } from './sort-by-document-order'
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

  /*
   * Registry bookkeeping is O(1) per option change (GHO-176). Earlier
   * revisions copied an order array, scanned it with `includes`, and copied
   * the record and label Maps on every register / unregister so that a
   * replaced `shallowRef` would notify readers; mounting, filtering, or
   * reordering n options was O(n²) (about 1.3 s of pure bookkeeping for 3000
   * options in jsdom; see `tests/bench/select-combobox-registry.bench.ts`).
   *
   * - The record Map's insertion order *is* the registration order: `set` on
   *   a new key appends, `set` on an existing key keeps its slot, and
   *   `delete` removes it, exactly like the former push-if-absent / filter
   *   array. Rendered order still comes from the DOM (`sortByDocumentOrder`).
   * - Both Maps are `shallowReactive`, so `get(value)` tracks only that key:
   *   an option's own `isOptionDisabled` / `getOptionText` reads re-run when
   *   that option changes, not when any of n siblings register. Records are
   *   replaced, never mutated, so shallow tracking is sufficient.
   * - `registryVersion` / `labelVersion` stay the coarse signals for
   *   whole-list readers (`optionOrder`, `GhostSelectValue`); they are bumped
   *   synchronously so public state is current right after each call.
   */
  const optionRegistry = shallowReactive(
    new Map<string, GhostSelectOptionRecord>(),
  )
  // Survives unregistration so the selected label outlives a filtered option.
  const optionLabels = shallowReactive(new Map<string, string>())
  const registryVersion = shallowRef(0)
  const labelVersion = shallowRef(0)

  let typeaheadString = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined
  let typeaheadMatchIndex = 0

  function bumpRegistry(): void {
    registryVersion.value += 1
  }

  function setLabel(value: string, textValue: string): void {
    optionLabels.set(value, textValue)
    labelVersion.value += 1
  }

  function registerOption(
    value: string,
    textValue: string,
    optionDisabled: boolean,
    getElement: () => HTMLElement | null,
  ): void {
    setLabel(value, textValue)
    optionRegistry.set(value, {
      value,
      textValue,
      disabled: optionDisabled,
      getElement,
    })
    bumpRegistry()
  }

  function setOptionDisabled(value: string, optionDisabled: boolean): void {
    const record = toRaw(optionRegistry).get(value)
    if (!record || record.disabled === optionDisabled) {
      return
    }
    optionRegistry.set(value, { ...record, disabled: optionDisabled })
    bumpRegistry()
  }

  function setOptionTextValue(value: string, textValue: string): void {
    const record = toRaw(optionRegistry).get(value)
    if (!record || record.textValue === textValue) {
      return
    }
    setLabel(value, textValue)
    optionRegistry.set(value, { ...record, textValue })
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
    if (optionRegistry.delete(value)) {
      bumpRegistry()
    }
  }

  function isOptionDisabled(value: string): boolean {
    return disabled.value || Boolean(optionRegistry.get(value)?.disabled)
  }

  /**
   * Enabled options in rendered DOM order for open-time first/last focus and
   * typeahead. Arrow keys already follow DOM order through `useRovingFocus`;
   * the registry appends on mount, so after keyed reordering, insertion before
   * existing options, or filter-and-restore its order is stale and must not
   * drive these paths. Sorted only when a key or open needs it.
   */
  function enabledOptionsInOrder(): GhostSelectOptionRecord[] {
    void registryVersion.value
    const enabled = disabled.value
      ? []
      : [...toRaw(optionRegistry).values()].filter((entry) => !entry.disabled)
    return sortByDocumentOrder(enabled, (entry) => entry.getElement())
  }

  function focusElement(element: HTMLElement | null | undefined): void {
    element?.focus({ preventScroll: true })
  }

  function focusOptionByValue(value: string): void {
    const record = optionRegistry.get(value)
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
    return optionRegistry.get(value)?.textValue ?? optionLabels.get(value)
  }

  function handleTypeahead(event: KeyboardEvent): void {
    // Composed characters are not typeahead input until the IME commits them;
    // guarded here as well so custom content that calls `handleTypeahead`
    // directly gets the same behavior as `GhostSelectContent`.
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isImeComposing(event)
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
      el.setCustomValidity(
        toValue(options.messages)?.required ?? 'Select a value.',
      )
    } else {
      el.setCustomValidity('')
      constraintInvalid.value = false
    }
  }

  /** Native `invalid` on the mirror input — surfacing invalid state on the trigger. */
  function handleFormInputInvalid(): void {
    constraintInvalid.value = true
  }

  watch(
    [selectedValue, required, () => toValue(options.messages)?.required],
    () => {
      syncFormValidity()
    },
  )

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
      return [...toRaw(optionRegistry).keys()]
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
