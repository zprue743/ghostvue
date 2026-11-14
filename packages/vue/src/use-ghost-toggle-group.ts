import { computed, shallowRef, toValue } from 'vue'

import type {
  GhostToggleGroupOrientation,
  GhostToggleGroupType,
  GhostToggleGroupValue,
  UseGhostToggleGroupOptions,
  UseGhostToggleGroupReturn,
} from './ghost-toggle-group'
import { useControllableState } from './use-controllable-state'
import type { TextDirection } from './use-roving-focus'

function normalizeDefault(
  type: GhostToggleGroupType,
  raw: GhostToggleGroupValue | undefined,
): GhostToggleGroupValue {
  if (raw !== undefined) {
    return raw
  }
  return type === 'multiple' ? [] : undefined
}

function isArrayValue(value: GhostToggleGroupValue): value is string[] {
  return Array.isArray(value)
}

/**
 * Headless toggle-group selection for single (`string | undefined`) and
 * multiple (`string[]`) modes.
 */
export function useGhostToggleGroup(
  options: UseGhostToggleGroupOptions = {},
): UseGhostToggleGroupReturn {
  const type = computed<GhostToggleGroupType>(
    () => toValue(options.type) ?? 'single',
  )

  const modelValue = useControllableState<GhostToggleGroupValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: () =>
      normalizeDefault(type.value, toValue(options.defaultValue)),
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  const orientation = computed<GhostToggleGroupOrientation>(
    () => toValue(options.orientation) ?? 'horizontal',
  )
  const dir = computed<TextDirection | undefined>(() => toValue(options.dir))
  const groupDisabled = computed(() => Boolean(toValue(options.disabled)))

  const itemOrder = shallowRef<string[]>([])
  const itemDisabled = shallowRef(new Map<string, boolean>())
  const registryVersion = shallowRef(0)

  function bumpRegistry(): void {
    itemDisabled.value = new Map(itemDisabled.value)
    registryVersion.value += 1
  }

  function registerItem(value: string, disabled: boolean): void {
    const nextOrder = [...itemOrder.value]
    if (!nextOrder.includes(value)) {
      nextOrder.push(value)
      itemOrder.value = nextOrder
    }
    itemDisabled.value.set(value, disabled)
    bumpRegistry()
  }

  function setItemDisabled(value: string, disabled: boolean): void {
    if (itemDisabled.value.get(value) === disabled) {
      return
    }
    itemDisabled.value.set(value, disabled)
    bumpRegistry()
  }

  function unregisterItem(value: string): void {
    itemOrder.value = itemOrder.value.filter((item) => item !== value)
    itemDisabled.value.delete(value)
    bumpRegistry()
  }

  const tabStopValue = computed((): string | undefined => {
    void registryVersion.value
    const order = itemOrder.value
    if (type.value === 'single') {
      const selected = modelValue.value
      if (
        typeof selected === 'string' &&
        order.includes(selected) &&
        !itemDisabled.value.get(selected)
      ) {
        return selected
      }
      return order.find((value) => !itemDisabled.value.get(value))
    }

    const pressed = isArrayValue(modelValue.value) ? modelValue.value : []
    for (const value of order) {
      if (pressed.includes(value) && !itemDisabled.value.get(value)) {
        return value
      }
    }
    return order.find((value) => !itemDisabled.value.get(value))
  })

  function isPressed(value: string): boolean {
    const current = modelValue.value
    if (type.value === 'multiple') {
      const list = isArrayValue(current) ? current : []
      return list.includes(value)
    }
    return current === value
  }

  function toggle(value: string): void {
    if (groupDisabled.value || itemDisabled.value.get(value)) {
      return
    }

    if (type.value === 'multiple') {
      const current = isArrayValue(modelValue.value)
        ? [...modelValue.value]
        : []
      const index = current.indexOf(value)
      if (index >= 0) {
        current.splice(index, 1)
      } else {
        current.push(value)
      }
      modelValue.value = current
      return
    }

    const current = modelValue.value
    modelValue.value = current === value ? undefined : value
  }

  return {
    type,
    modelValue,
    orientation,
    dir,
    groupDisabled,
    isPressed,
    toggle,
    registerItem,
    setItemDisabled,
    unregisterItem,
    tabStopValue,
    registryVersion,
  }
}
