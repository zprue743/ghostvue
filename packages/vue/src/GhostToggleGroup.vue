<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef, watch } from 'vue'

import {
  ghostToggleGroupContextKey,
  resolveToggleGroupHtmlElement,
  type GhostToggleGroupElement,
  type GhostToggleGroupExposed,
  type GhostToggleGroupValue,
} from './ghost-toggle-group'
import { applyToggleGroupSelectionTabStops } from './sync-toggle-group-selection-tab-stops'
import { useGhostToggleGroup } from './use-ghost-toggle-group'
import { useRovingFocus } from './use-roving-focus'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** Single vs multiple pressed items. */
    type?: 'single' | 'multiple'
    /** Controlled selection; shape follows `type`. */
    modelValue?: GhostToggleGroupValue
    /** Initial selection when `modelValue` is omitted. */
    defaultValue?: GhostToggleGroupValue
    /** Arrow-key roving layout. */
    orientation?: 'horizontal' | 'vertical'
    /** Explicit text direction for horizontal roving. */
    dir?: 'ltr' | 'rtl' | undefined
    /** Root host element. */
    as?: GhostToggleGroupElement
    /** Disables every item. */
    disabled?: boolean
  }>(),
  {
    type: 'single',
    modelValue: undefined,
    defaultValue: undefined,
    orientation: 'horizontal',
    dir: undefined,
    as: 'div',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: GhostToggleGroupValue]
}>()

defineSlots<{
  default(): unknown
}>()

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveToggleGroupHtmlElement(hostRef.value))

const group = useGhostToggleGroup({
  type: () => props.type,
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  orientation: () => props.orientation,
  dir: () => props.dir,
  disabled: () => props.disabled,
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

watch(
  () =>
    [
      group.modelValue.value,
      group.tabStopValue.value,
      group.registryVersion.value,
    ] as const,
  () => {
    const root = element.value
    if (root) {
      applyToggleGroupSelectionTabStops(root, group.tabStopValue.value)
    }
  },
  { flush: 'post' },
)

function onFocusOut(event: FocusEvent): void {
  const root = element.value
  if (!root) {
    return
  }
  const related = event.relatedTarget
  if (related instanceof Node && root.contains(related)) {
    return
  }
  applyToggleGroupSelectionTabStops(root, group.tabStopValue.value)
}

const rootAttrs = computed(() => {
  const orientation = group.orientation.value
  const rootClass = 'ghost-toggle-group'
  const base: Record<string, unknown> = {
    role: 'group',
    'data-part': 'root',
    'data-ghost-toggle-group': '',
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

provide(ghostToggleGroupContextKey, {
  type: group.type,
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
  syncSelectionTabStops(groupRoot) {
    applyToggleGroupSelectionTabStops(groupRoot, group.tabStopValue.value)
  },
})

defineExpose<GhostToggleGroupExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const root = element.value
    if (!root) {
      return
    }
    const stop = applyToggleGroupSelectionTabStops(
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
  </component>
</template>
