import { computed, shallowRef, toValue } from 'vue'

import type {
  GhostTabsActivationMode,
  GhostTabsOrientation,
  UseGhostTabsOptions,
  UseGhostTabsReturn,
} from './ghost-tabs'
import { useControllableState } from './use-controllable-state'
import type { TextDirection } from './use-roving-focus'

/**
 * Headless tabs selection state, activation mode, and value→id registries for ARIA wiring.
 */
export function useGhostTabs(
  options: UseGhostTabsOptions = {},
): UseGhostTabsReturn {
  const hasExplicitDefault = computed(
    () => toValue(options.defaultValue) !== undefined,
  )

  const modelValue = useControllableState<string | undefined>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      if (next !== undefined) {
        options.onValueChange?.(next)
      }
    },
  })

  const activationMode = computed<GhostTabsActivationMode>(
    () => toValue(options.activationMode) ?? 'automatic',
  )
  const orientation = computed<GhostTabsOrientation>(
    () => toValue(options.orientation) ?? 'horizontal',
  )
  const dir = computed<TextDirection | undefined>(() => toValue(options.dir))

  const triggerIds = shallowRef(new Map<string, string>())
  const panelIds = shallowRef(new Map<string, string>())
  const triggerOrder = shallowRef<string[]>([])
  const registryVersion = shallowRef(0)

  const defaultUncontrolled = computed(
    () =>
      toValue(options.modelValue) === undefined && !hasExplicitDefault.value,
  )

  function bumpMaps(): void {
    triggerIds.value = new Map(triggerIds.value)
    panelIds.value = new Map(panelIds.value)
    registryVersion.value += 1
  }

  function ensureInitialSelection(nextValue: string): void {
    if (!defaultUncontrolled.value) {
      return
    }
    modelValue.value ??= nextValue
  }

  function registerTrigger(value: string, triggerId: string): void {
    const nextOrder = [...triggerOrder.value]
    if (!nextOrder.includes(value)) {
      nextOrder.push(value)
      triggerOrder.value = nextOrder
      ensureInitialSelection(value)
    }
    triggerIds.value.set(value, triggerId)
    bumpMaps()
  }

  function unregisterTrigger(value: string): void {
    triggerOrder.value = triggerOrder.value.filter((item) => item !== value)
    triggerIds.value.delete(value)
    bumpMaps()
  }

  function registerPanel(value: string, panelId: string): void {
    panelIds.value.set(value, panelId)
    bumpMaps()
  }

  function unregisterPanel(value: string): void {
    panelIds.value.delete(value)
    bumpMaps()
  }

  function getTriggerId(value: string): string | undefined {
    return triggerIds.value.get(value)
  }

  function getPanelId(value: string): string | undefined {
    return panelIds.value.get(value)
  }

  function isSelected(value: string): boolean {
    return modelValue.value === value
  }

  function select(value: string): void {
    if (triggerIds.value.has(value) && !Object.is(modelValue.value, value)) {
      modelValue.value = value
    }
  }

  return {
    modelValue,
    activationMode,
    orientation,
    dir,
    select,
    isSelected,
    registerTrigger,
    unregisterTrigger,
    registerPanel,
    unregisterPanel,
    getTriggerId,
    getPanelId,
    defaultUncontrolled,
    registryVersion,
  }
}
