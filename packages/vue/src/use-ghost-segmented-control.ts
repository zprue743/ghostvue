import { computed, shallowRef, toValue, type Ref } from 'vue'

import type {
  GhostSegmentedControlValue,
  UseGhostSegmentedControlOptions,
  UseGhostSegmentedControlReturn,
} from './ghost-segmented-control'
import { useGhostToggleGroup } from './use-ghost-toggle-group'

/**
 * Headless single-select segmented control built on
 * {@link useGhostToggleGroup} with indicator-friendly registration order.
 */
export function useGhostSegmentedControl(
  options: UseGhostSegmentedControlOptions = {},
): UseGhostSegmentedControlReturn {
  const itemOrder = shallowRef<string[]>([])

  const group = useGhostToggleGroup({
    type: () => 'single',
    modelValue: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    orientation: () => toValue(options.orientation) ?? 'horizontal',
    dir: () => toValue(options.dir),
    disabled: () => Boolean(toValue(options.disabled)),
    onValueChange: (next) => {
      if (typeof next === 'string' || next === undefined) {
        options.onValueChange?.(next)
      }
    },
  })

  const deselectable = computed(() => Boolean(toValue(options.deselectable)))

  function registerItem(value: string, disabled: boolean): void {
    group.registerItem(value, disabled)
    if (!itemOrder.value.includes(value)) {
      itemOrder.value = [...itemOrder.value, value]
    }
  }

  function unregisterItem(value: string): void {
    group.unregisterItem(value)
    itemOrder.value = itemOrder.value.filter((item) => item !== value)
  }

  function setItemDisabled(value: string, disabled: boolean): void {
    group.setItemDisabled(value, disabled)
  }

  function toggle(value: string): void {
    if (!deselectable.value && group.isPressed(value)) {
      return
    }
    group.toggle(value)
  }

  const selectedIndex = computed((): number => {
    void group.registryVersion.value
    const selected = group.modelValue.value
    if (typeof selected !== 'string') {
      return -1
    }
    return itemOrder.value.indexOf(selected)
  })

  const itemCount = computed(() => itemOrder.value.length)

  return {
    modelValue: group.modelValue as Ref<GhostSegmentedControlValue>,
    orientation: group.orientation,
    dir: group.dir,
    groupDisabled: group.groupDisabled,
    deselectable,
    isPressed: group.isPressed,
    toggle,
    registerItem,
    setItemDisabled,
    unregisterItem,
    tabStopValue: group.tabStopValue,
    registryVersion: group.registryVersion,
    itemOrder,
    selectedIndex,
    itemCount,
  }
}
