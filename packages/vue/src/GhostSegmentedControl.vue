<script setup lang="ts">
import {
  computed,
  onMounted,
  onUpdated,
  provide,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostSegmentedControlContextKey,
  resolveSegmentedControlHtmlElement,
  type GhostSegmentedControlElement,
  type GhostSegmentedControlExposed,
  type GhostSegmentedControlValue,
} from './ghost-segmented-control'
import { applySegmentedControlSelectionTabStops } from './sync-toggle-group-selection-tab-stops'
import GhostSegmentedControlIndicator from './GhostSegmentedControlIndicator.vue'
import { useGhostSegmentedControl } from './use-ghost-segmented-control'
import { useRovingFocus } from './use-roving-focus'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Controlled selection. */
    modelValue?: GhostSegmentedControlValue
    /** Initial selection when `modelValue` is omitted. */
    defaultValue?: GhostSegmentedControlValue
    /** Arrow-key roving layout and indicator slide axis. */
    orientation?: 'horizontal' | 'vertical'
    /** Explicit text direction for horizontal roving. */
    dir?: 'ltr' | 'rtl' | undefined
    /** Root host element. */
    as?: GhostSegmentedControlElement
    /** Disables every item. */
    disabled?: boolean
    /**
     * When false, pressing the active segment keeps it selected (default view
     * switching).
     */
    deselectable?: boolean
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    orientation: 'horizontal',
    dir: undefined,
    as: 'div',
    disabled: false,
    deselectable: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: GhostSegmentedControlValue]
}>()

defineSlots<{
  default(): unknown
}>()

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() =>
  resolveSegmentedControlHtmlElement(hostRef.value),
)

const group = useGhostSegmentedControl({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  orientation: () => props.orientation,
  dir: () => props.dir,
  disabled: () => props.disabled,
  deselectable: () => props.deselectable,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
})

useRovingFocus(element, {
  orientation: () => group.orientation.value,
  dir: () => {
    const explicit = group.dir.value
    if (explicit === 'ltr' || explicit === 'rtl') {
      return explicit
    }
    const host = element.value
    if (host) {
      const closest = host.closest('[dir]')?.getAttribute('dir')
      if (closest === 'ltr' || closest === 'rtl') {
        return closest
      }
    }
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  },
  loop: true,
})

function syncAfterDomUpdate(): void {
  const root = element.value
  if (!root) {
    return
  }
  group.reconcileItemOrderFromDom(root)
  applySegmentedControlSelectionTabStops(root, group.tabStopValue.value)
}

watch(
  () =>
    [
      group.modelValue.value,
      group.tabStopValue.value,
      group.registryVersion.value,
    ] as const,
  () => {
    syncAfterDomUpdate()
  },
  { flush: 'post' },
)

onMounted(() => {
  syncAfterDomUpdate()
})

onUpdated(() => {
  syncAfterDomUpdate()
})

function onFocusOut(event: FocusEvent): void {
  const root = element.value
  if (!root) {
    return
  }
  const related = event.relatedTarget
  if (related instanceof Node && root.contains(related)) {
    return
  }
  applySegmentedControlSelectionTabStops(root, group.tabStopValue.value)
}

const rootAttrs = computed(() => {
  const orientation = group.orientation.value
  const rootClass = 'ghost-segmented-control'
  const base: Record<string, unknown> = {
    role: 'group',
    'data-part': 'root',
    'data-ghost-segmented-control': '',
    'aria-disabled': group.groupDisabled.value ? 'true' : undefined,
  }
  if (orientation === 'vertical') {
    base['aria-orientation'] = 'vertical'
  }
  const extraClass = attrs.class
  return {
    ...attrs,
    ...base,
    class: extraClass ? [rootClass, extraClass] : rootClass,
  }
})

provide(ghostSegmentedControlContextKey, {
  modelValue: group.modelValue,
  orientation: group.orientation,
  dir: group.dir,
  groupDisabled: group.groupDisabled,
  isPressed: group.isPressed,
  toggle: group.toggle,
  registerItem: group.registerItem,
  setItemDisabled: group.setItemDisabled,
  unregisterItem: group.unregisterItem,
  tabStopValue: group.tabStopValue,
  registryVersion: group.registryVersion,
  itemCount: group.itemCount,
  selectedIndex: group.selectedIndex,
  syncSelectionTabStops(groupRoot) {
    applySegmentedControlSelectionTabStops(groupRoot, group.tabStopValue.value)
  },
})

defineExpose<GhostSegmentedControlExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const root = element.value
    if (!root) {
      return
    }
    const stop = applySegmentedControlSelectionTabStops(
      root,
      group.tabStopValue.value,
    )
    stop?.focus(options)
  },
  blur() {
    const active = document.activeElement
    const root = element.value
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur()
    }
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="rootAttrs" @focusout="onFocusOut">
    <slot />
    <GhostSegmentedControlIndicator />
  </component>
</template>
