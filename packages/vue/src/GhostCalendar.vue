<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { provide, shallowRef } from 'vue'

import {
  ghostCalendarContextKey,
  type GhostCalendarExposed,
  type GhostCalendarSelectionMode,
  type GhostCalendarValue,
} from './ghost-calendar'
import { applyCalendarFocusTabStops } from './sync-calendar-focus-tab-stops'
import { useGhostCalendar } from './use-ghost-calendar'
import { useGhostVisuallyHidden } from './use-ghost-visually-hidden'

const props = withDefaults(
  defineProps<{
    modelValue?: GhostCalendarValue
    defaultValue?: GhostCalendarValue
    selectionMode?: GhostCalendarSelectionMode
    minValue?: CalendarDate | undefined
    maxValue?: CalendarDate | undefined
    isDateDisabled?: ((date: CalendarDate) => boolean) | undefined
    locale?: string
    weekStartsOn?: number | undefined
    visibleMonth?: CalendarDate | undefined
    defaultVisibleMonth?: CalendarDate | undefined
    today?: CalendarDate | undefined
    disabled?: boolean
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    selectionMode: 'single',
    minValue: undefined,
    maxValue: undefined,
    isDateDisabled: undefined,
    locale: 'en-US',
    weekStartsOn: undefined,
    visibleMonth: undefined,
    defaultVisibleMonth: undefined,
    today: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: GhostCalendarValue]
  'update:visibleMonth': [month: CalendarDate]
}>()

defineSlots<{
  default(props: {
    modelValue: GhostCalendarValue
    visibleMonth: CalendarDate
    selectionMode: GhostCalendarSelectionMode
  }): unknown
}>()

const gridElement = shallowRef<HTMLElement | null>(null)
const liveRegion = useGhostVisuallyHidden()

const calendar = useGhostCalendar({
  modelValue: () => props.modelValue,
  defaultValue: () => props.defaultValue,
  selectionMode: () => props.selectionMode,
  minValue: () => props.minValue,
  maxValue: () => props.maxValue,
  isDateDisabled: () => props.isDateDisabled,
  locale: () => props.locale,
  weekStartsOn: () => props.weekStartsOn,
  visibleMonth: () => props.visibleMonth,
  defaultVisibleMonth: () => props.defaultVisibleMonth,
  today: () => props.today,
  disabled: () => props.disabled,
  onValueChange: (next) => {
    emit('update:modelValue', next)
  },
  onVisibleMonthChange: (month) => {
    emit('update:visibleMonth', month)
  },
})

defineExpose<GhostCalendarExposed>({
  get element() {
    return null
  },
})

provide(ghostCalendarContextKey, {
  ...calendar,
  setGridElement(element: HTMLElement | null) {
    gridElement.value = element
  },
  syncFocusedTabStops(gridRoot: HTMLElement) {
    applyCalendarFocusTabStops(gridRoot, calendar.focusedDate.value.toString())
  },
})
</script>

<template>
  <slot
    :model-value="calendar.modelValue.value"
    :visible-month="calendar.visibleMonth.value"
    :selection-mode="calendar.selectionMode.value"
  />
  <span
    aria-live="polite"
    class="ghost-calendar-live"
    v-bind="liveRegion.rootProps.value"
    >{{ calendar.announceMonth.value }}</span
  >
</template>
