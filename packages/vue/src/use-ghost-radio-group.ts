import { computed, nextTick, shallowRef, toValue } from 'vue'

import type {
  GhostRadioGroupOrientation,
  UseGhostRadioGroupOptions,
  UseGhostRadioGroupReturn,
} from './ghost-radio-group'
import { useControllableState } from './use-controllable-state'

interface ItemRecord {
  disabled: boolean
  getElement: () => HTMLInputElement | null
}

/**
 * Selected value, item registry, and form-reset seed for {@link GhostRadioGroup}.
 */
export function useGhostRadioGroup(
  options: UseGhostRadioGroupOptions = {},
): UseGhostRadioGroupReturn {
  const hasExplicitDefault = computed(
    () => toValue(options.defaultValue) !== undefined,
  )

  // Captured once so later defaultValue writes cannot retarget form reset.
  const resetSeed = toValue(options.defaultValue)

  const selectedValue = useControllableState<string | undefined>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      if (suppressChange || next === undefined) {
        return
      }
      options.onValueChange?.(next)
    },
  })

  const name = computed((): string | undefined => toValue(options.name))
  const disabled = computed(() => Boolean(toValue(options.disabled)))
  const required = computed(() => Boolean(toValue(options.required)))
  const invalid = computed(() => Boolean(toValue(options.invalid)))
  const orientation = computed<GhostRadioGroupOrientation>(
    () => toValue(options.orientation) ?? 'vertical',
  )
  const dir = computed(() => toValue(options.dir))

  const itemOrder = shallowRef<string[]>([])
  const items = shallowRef(new Map<string, ItemRecord>())
  const registryVersion = shallowRef(0)
  let suppressChange = false

  const defaultUncontrolled = computed(
    () =>
      toValue(options.modelValue) === undefined && !hasExplicitDefault.value,
  )

  function bumpRegistry(): void {
    items.value = new Map(items.value)
    registryVersion.value += 1
  }

  function ensureInitialSelection(value: string): void {
    if (!defaultUncontrolled.value) {
      return
    }
    if (selectedValue.value === undefined) {
      suppressChange = true
      selectedValue.value = value
      suppressChange = false
    }
  }

  function registerItem(
    value: string,
    itemDisabled: boolean,
    getElement: () => HTMLInputElement | null,
  ): void {
    const nextOrder = [...itemOrder.value]
    if (!nextOrder.includes(value)) {
      nextOrder.push(value)
      itemOrder.value = nextOrder
      ensureInitialSelection(value)
    }
    items.value.set(value, { disabled: itemDisabled, getElement })
    bumpRegistry()
  }

  function setItemDisabled(value: string, itemDisabled: boolean): void {
    const record = items.value.get(value)
    if (!record || record.disabled === itemDisabled) {
      return
    }
    items.value.set(value, { ...record, disabled: itemDisabled })
    bumpRegistry()
  }

  function unregisterItem(value: string): void {
    itemOrder.value = itemOrder.value.filter((entry) => entry !== value)
    items.value.delete(value)
    bumpRegistry()
    if (selectedValue.value === value) {
      const fallback = itemOrder.value.find(
        (entry) => !items.value.get(entry)?.disabled,
      )
      selectedValue.value = fallback
    }
  }

  function isItemDisabled(value: string): boolean {
    return disabled.value || Boolean(items.value.get(value)?.disabled)
  }

  function select(value: string): void {
    if (isItemDisabled(value)) {
      return
    }
    selectedValue.value = value
  }

  function isSelected(value: string): boolean {
    return selectedValue.value === value
  }

  function syncItemChecked(input: HTMLInputElement, value: string): void {
    if (!input.isConnected) {
      return
    }
    const shouldCheck = selectedValue.value === value
    if (input.checked !== shouldCheck) {
      input.checked = shouldCheck
    }
  }

  function restoreItemDom(value: string): void {
    const record = items.value.get(value)
    const input = record?.getElement()
    if (!input) {
      return
    }
    syncItemChecked(input, value)
  }

  function restoreAllItemDom(): void {
    for (const value of itemOrder.value) {
      restoreItemDom(value)
    }
  }

  function applyFormReset(): void {
    selectedValue.value = resetSeed
    const controlled = toValue(options.modelValue) !== undefined
    if (!controlled) {
      restoreAllItemDom()
      return
    }
    void nextTick(() => {
      restoreAllItemDom()
    })
  }

  return {
    selectedValue,
    name,
    disabled,
    required,
    invalid,
    orientation,
    dir,
    select,
    isSelected,
    isItemDisabled,
    registerItem,
    setItemDisabled,
    unregisterItem,
    restoreItemDom,
    applyFormReset,
    registryVersion,
  }
}
