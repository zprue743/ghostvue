import type {
  CalendarDate,
  DateDuration,
  DateValue,
} from '@internationalized/date'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
  WritableComputedRef,
} from 'vue'

/** Inclusive range selection value. */
export interface GhostCalendarRangeValue {
  start: DateValue
  end: DateValue
}

export type GhostCalendarValue = DateValue | GhostCalendarRangeValue | undefined

export type GhostCalendarSelectionMode = 'single' | 'range'

export type GhostCalendarHeaderElement = string | Component
export type GhostCalendarHeadingElement = string | Component
export type GhostCalendarNavButtonElement = string | Component
export type GhostCalendarGridElement = string | Component
export type GhostCalendarCellElement = string | Component

export type GhostCalendarCellState =
  'selected' | 'range-start' | 'range-end' | 'range-middle' | 'none'

export interface GhostCalendarProps {
  modelValue?: GhostCalendarValue
  defaultValue?: GhostCalendarValue
  selectionMode?: GhostCalendarSelectionMode
  minValue?: CalendarDate
  maxValue?: CalendarDate
  isDateDisabled?: (date: CalendarDate) => boolean
  locale?: string
  weekStartsOn?: number
  visibleMonth?: CalendarDate | undefined
  defaultVisibleMonth?: CalendarDate | undefined
  today?: CalendarDate | undefined
  disabled?: boolean
}

export interface GhostCalendarSlotProps {
  modelValue: GhostCalendarValue
  visibleMonth: CalendarDate
  selectionMode: GhostCalendarSelectionMode
}

export interface GhostCalendarHeadingSlotProps {
  label: string
  visibleMonth: CalendarDate
}

export interface GhostCalendarGridCellSlotProps {
  date: CalendarDate
  disabled: boolean
  selected: boolean
  focused: boolean
  today: boolean
  outsideMonth: boolean
  state: GhostCalendarCellState
  formattedDate: string
}

export interface GhostCalendarExposed {
  readonly element: HTMLElement | null
}

export interface GhostCalendarPartExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface UseGhostCalendarOptions {
  modelValue?: MaybeRefOrGetter<GhostCalendarValue>
  defaultValue?: MaybeRefOrGetter<GhostCalendarValue>
  selectionMode?: MaybeRefOrGetter<GhostCalendarSelectionMode>
  minValue?: MaybeRefOrGetter<CalendarDate | undefined>
  maxValue?: MaybeRefOrGetter<CalendarDate | undefined>
  isDateDisabled?: MaybeRefOrGetter<
    ((date: CalendarDate) => boolean) | undefined
  >
  locale?: MaybeRefOrGetter<string>
  weekStartsOn?: MaybeRefOrGetter<number | undefined>
  visibleMonth?: MaybeRefOrGetter<CalendarDate | undefined>
  defaultVisibleMonth?: MaybeRefOrGetter<CalendarDate | undefined>
  today?: MaybeRefOrGetter<CalendarDate | undefined>
  disabled?: MaybeRefOrGetter<boolean>
  onValueChange?: (value: GhostCalendarValue) => void
  onVisibleMonthChange?: (month: CalendarDate) => void
}

export interface UseGhostCalendarReturn {
  modelValue: WritableComputedRef<GhostCalendarValue>
  visibleMonth: WritableComputedRef<CalendarDate>
  selectionMode: ComputedRef<GhostCalendarSelectionMode>
  locale: ComputedRef<string>
  weekStartsOn: ComputedRef<number | undefined>
  today: ComputedRef<CalendarDate | undefined>
  disabled: ComputedRef<boolean>
  focusedDate: Ref<CalendarDate>
  gridDates: ComputedRef<CalendarDate[]>
  weekRows: ComputedRef<CalendarDate[][]>
  weekdayLabels: ComputedRef<string[]>
  monthYearLabel: ComputedRef<string>
  selectDate: (date: CalendarDate) => void
  isDateDisabledForInteraction: (date: CalendarDate) => boolean
  isDateSelectionDisabled: (date: CalendarDate) => boolean
  getCellState: (date: CalendarDate) => GhostCalendarCellState
  isDateFocused: (date: CalendarDate) => boolean
  setFocusedDate: (date: CalendarDate, options?: { announce?: boolean }) => void
  focusNextDay: (reverse?: boolean) => void
  focusNextWeek: (reverse?: boolean) => void
  focusWeekBoundary: (end?: boolean) => void
  focusNextMonth: (reverse?: boolean) => void
  focusNextYear: (reverse?: boolean) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  registerHeadingId: (id: string) => void
  unregisterHeadingId: () => void
  headingId: Ref<string | undefined>
  announceMonth: Ref<string>
}

export interface GhostCalendarContext extends UseGhostCalendarReturn {
  setGridElement: (element: HTMLElement | null) => void
  syncFocusedTabStops: (gridRoot: HTMLElement) => void
}

export const ghostCalendarContextKey: InjectionKey<GhostCalendarContext> =
  Symbol('ghostCalendarContext')

function componentHostElement(host: { $el: unknown }): HTMLElement | null {
  return host.$el instanceof HTMLElement ? host.$el : null
}

export function resolveCalendarHtmlElement(host: unknown): HTMLElement | null {
  if (host instanceof HTMLElement) {
    return host
  }
  if (
    typeof host === 'object' &&
    host !== null &&
    '$el' in host &&
    typeof host === 'object'
  ) {
    return componentHostElement(host)
  }
  return null
}

export function isCalendarRangeValue(
  value: GhostCalendarValue,
): value is GhostCalendarRangeValue {
  return (
    value !== undefined &&
    typeof value === 'object' &&
    'start' in value &&
    'end' in value
  )
}

export function calendarDurationMonths(count: number): DateDuration {
  return { months: count }
}

export function calendarDurationYears(count: number): DateDuration {
  return { years: count }
}
