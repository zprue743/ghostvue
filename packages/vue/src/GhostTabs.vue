<script setup lang="ts">
import { provide } from 'vue'

import { ghostTabsContextKey, type GhostTabsExposed } from './ghost-tabs'
import { applyTabsSelectionTabStops } from './sync-tabs-selection-tab-stops'
import { useGhostTabs } from './use-ghost-tabs'

// Explicit `modelValue: undefined` prevents Vue from coercing an omitted string prop,
// preserving uncontrolled mode in useControllableState.
const props = withDefaults(
  defineProps<{
    /** Controlled selected tab value. Omit for uncontrolled mode. */
    modelValue?: string | undefined
    /** Initial selected value when `modelValue` is omitted. */
    defaultValue?: string | undefined
    /** Focus-driven (`automatic`) vs explicit activation (`manual`) tab selection. */
    activationMode?: 'automatic' | 'manual'
    /** Tab list orientation for arrow-key roving and `aria-orientation`. */
    orientation?: 'horizontal' | 'vertical'
    /** Explicit text direction for roving focus within the tab list. */
    dir?: 'ltr' | 'rtl' | undefined
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    activationMode: 'automatic',
    orientation: 'horizontal',
    dir: undefined,
  },
)

const emit = defineEmits<{
  /** Emitted when the selected tab value changes. */
  'update:modelValue': [value: string]
}>()

defineSlots<{
  default(props: { modelValue: string | undefined }): unknown
}>()

const tabs = useGhostTabs({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  activationMode: () => props.activationMode,
  orientation: () => props.orientation,
  dir: () => props.dir,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
})

defineExpose<GhostTabsExposed>({
  get element() {
    return null
  },
})

provide(ghostTabsContextKey, {
  modelValue: tabs.modelValue,
  activationMode: tabs.activationMode,
  orientation: tabs.orientation,
  dir: tabs.dir,
  tabStopValue: tabs.tabStopValue,
  select: tabs.select,
  isSelected: tabs.isSelected,
  registerTrigger: tabs.registerTrigger,
  setTriggerDisabled: tabs.setTriggerDisabled,
  unregisterTrigger: tabs.unregisterTrigger,
  registerPanel: tabs.registerPanel,
  unregisterPanel: tabs.unregisterPanel,
  getTriggerId: tabs.getTriggerId,
  getPanelId: tabs.getPanelId,
  registryVersion: tabs.registryVersion,
  syncSelectionTabStops(listRoot) {
    applyTabsSelectionTabStops(listRoot, tabs.tabStopValue.value)
  },
})
</script>

<template>
  <slot :model-value="tabs.modelValue.value" />
</template>
