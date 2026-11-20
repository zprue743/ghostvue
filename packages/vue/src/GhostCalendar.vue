<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, provide, shallowRef } from 'vue'

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
    /**
     * Controlled selection. Omit for uncontrolled state; `null` is a
     * controlled empty selection that ignores `defaultValue`.
     */
    modelValue?: GhostCalendarValue | null
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
  /**
   * Once per accepted date activation, after `update:modelValue`. Also fires
   * when the date is already selected or a controlled parent ignores the
   * proposal; disabled or unavailable activations emit nothing.
   */
  select: [date: CalendarDate]
  'update:visibleMonth': [month: CalendarDate]
}>()

defineSlots<{
  default(props: {
    modelValue: GhostCalendarValue
    visibleMonth: CalendarDate
    selectionMode: GhostCalendarSelectionMode
  }): unknown
}>()

const FOCUSABLE_CELL_CONTROL =
  'button, [href], input, select, textarea, [tabindex]'

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
  onSelect: (date) => {
    emit('select', date)
  },
  onVisibleMonthChange: (month) => {
    emit('update:visibleMonth', month)
  },
})

/**
 * Control for the roving focus date inside the mounted grid. Reads the cell by
 * its date key rather than its `tabindex`, because tab stops are synced in a
 * post-flush watcher that may not have run yet when a wrapper asks.
 */
function resolveFocusTarget(): HTMLElement | null {
  const grid = gridElement.value
  if (!grid) {
    return null
  }
  const cell = grid.querySelector<HTMLElement>(
    `[data-ghost-calendar-date="${calendar.focusedDate.value.toString()}"]`,
  )
  if (!cell) {
    return null
  }
  return cell.matches(FOCUSABLE_CELL_CONTROL)
    ? cell
    : cell.querySelector<HTMLElement>(FOCUSABLE_CELL_CONTROL)
}

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
  focusTarget: {
    ready: computed(() => gridElement.value !== null),
    resolve: resolveFocusTarget,
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
