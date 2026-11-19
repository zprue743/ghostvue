import {
  CalendarDate,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfWeek,
} from '@internationalized/date'
import { computed, ref, shallowRef, toValue } from 'vue'

import {
  addCalendarDuration,
  chunkWeekRows,
  compareCalendarDate,
  getMonthGridDates,
  normalizeVisibleMonth,
  resolveWeekStartName,
  toCalendarDate,
} from './calendar-date-math'
import {
  formatMonthYearLabel,
  formatWeekdayLabels,
  resolveLocaleWeekStart,
} from './calendar-intl'
import {
  calendarDurationMonths,
  calendarDurationYears,
  type GhostCalendarCellState,
  type GhostCalendarSelectionMode,
  type GhostCalendarValue,
  type UseGhostCalendarOptions,
  type UseGhostCalendarReturn,
  isCalendarRangeValue,
} from './ghost-calendar'
import { useControllableState } from './use-controllable-state'

/**
 * Selection used to seed the visible month and focus. A controlled `null`
 * means "empty", so it must not fall through to `defaultValue` the way an
 * omitted (`undefined`) model does.
 */
function initialSelection(
  options: UseGhostCalendarOptions,
): GhostCalendarValue {
  const controlled = toValue(options.modelValue)
  if (controlled === null) {
    return undefined
  }
  return controlled ?? toValue(options.defaultValue)
}

function initialVisibleMonth(options: UseGhostCalendarOptions): CalendarDate {
  const explicit = toValue(options.visibleMonth)
  if (explicit) {
    return normalizeVisibleMonth(explicit)
  }
  const fallback = toValue(options.defaultVisibleMonth)
  if (fallback) {
    return normalizeVisibleMonth(fallback)
  }
  const selection = initialSelection(options)
  if (selection instanceof CalendarDate) {
    return normalizeVisibleMonth(toCalendarDate(selection))
  }
  if (isCalendarRangeValue(selection)) {
    return normalizeVisibleMonth(toCalendarDate(selection.start))
  }
  return toCalendarDate(new CalendarDate(2024, 1, 1))
}

function initialFocusedDate(
  options: UseGhostCalendarOptions,
  visibleMonth: CalendarDate,
): CalendarDate {
  const selection = initialSelection(options)
  if (selection instanceof CalendarDate) {
    return toCalendarDate(selection)
  }
  if (isCalendarRangeValue(selection)) {
    return toCalendarDate(selection.start)
  }
  const explicitToday = toValue(options.today)
  if (explicitToday) {
    return toCalendarDate(explicitToday)
  }
  return toCalendarDate(visibleMonth)
}

function isBetweenInclusive(
  date: CalendarDate,
  start: CalendarDate,
  end: CalendarDate,
): boolean {
  return date.compare(start) >= 0 && date.compare(end) <= 0
}

/** Calendar root state: selection, visible month, and keyboard focus. */
export function useGhostCalendar(
  options: UseGhostCalendarOptions,
): UseGhostCalendarReturn {
  const defaultMonth = initialVisibleMonth(options)
  // `null` must reach useControllableState unchanged: it is the only way a
  // parent can hold the calendar controlled while empty (`undefined` means
  // uncontrolled). Public readers below normalize it back to `undefined` so
  // existing slot, return, and emitted value types stay unchanged.
  const selection = useControllableState<GhostCalendarValue | null>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      options.onValueChange?.(next ?? undefined)
    },
  })

  const modelValue = computed<GhostCalendarValue>({
    get: () => selection.value ?? undefined,
    set(next) {
      // Controlled-empty `null` and `undefined` are the same empty selection;
      // writing one over the other is not a change worth proposing.
      if (next === undefined && selection.value === null) {
        return
      }
      selection.value = next
    },
  })

  const visibleMonth = useControllableState<CalendarDate>({
    prop: () => {
      const month = toValue(options.visibleMonth)
      return month ? normalizeVisibleMonth(month) : undefined
    },
    defaultValue: () => defaultMonth,
    onChange: (next) => {
      options.onVisibleMonthChange?.(next)
    },
  })

  const selectionMode = computed<GhostCalendarSelectionMode>(
    () => toValue(options.selectionMode) ?? 'single',
  )
  const locale = computed(() => toValue(options.locale) ?? 'en-US')
  const weekStartsOn = computed(() => toValue(options.weekStartsOn))
  const today = computed(() => toValue(options.today))
  const disabled = computed(() => toValue(options.disabled) ?? false)
  const minValue = computed(() => toValue(options.minValue))
  const maxValue = computed(() => toValue(options.maxValue))
  const isDateDisabled = computed(() => toValue(options.isDateDisabled))

  const focusedDate = shallowRef<CalendarDate>(
    toCalendarDate(initialFocusedDate(options, defaultMonth)),
  )
  const headingId = shallowRef<string | undefined>(undefined)
  const announceMonth = ref('')

  const effectiveWeekStart = computed(
    () => weekStartsOn.value ?? resolveLocaleWeekStart(locale.value),
  )

  const gridDates = computed(() =>
    getMonthGridDates(
      visibleMonth.value,
      locale.value,
      effectiveWeekStart.value,
    ),
  )

  const weekRows = computed(() => chunkWeekRows(gridDates.value))

  const weekdayLabels = computed(() =>
    formatWeekdayLabels(locale.value, effectiveWeekStart.value),
  )

  const monthYearLabel = computed(() =>
    formatMonthYearLabel(visibleMonth.value, locale.value),
  )

  function isOutsideMonth(date: CalendarDate): boolean {
    return date.month !== visibleMonth.value.month
  }

  /** Hard keyboard focus bounds (min/max and root disabled only). */
  function isDateFocusDisabled(date: CalendarDate): boolean {
    if (disabled.value) {
      return true
    }
    if (minValue.value && compareCalendarDate(date, minValue.value) < 0) {
      return true
    }
    if (maxValue.value && compareCalendarDate(date, maxValue.value) > 0) {
      return true
    }
    return false
  }

  /** Consumer-marked unavailable dates: focusable but not selectable. */
  function isDateUnavailable(date: CalendarDate): boolean {
    return isDateDisabled.value?.(date) ?? false
  }

  function isDateDisabledForInteraction(date: CalendarDate): boolean {
    return isDateFocusDisabled(date) || isDateUnavailable(date)
  }

  function isDateSelectionDisabled(date: CalendarDate): boolean {
    return (
      isDateFocusDisabled(date) ||
      isDateUnavailable(date) ||
      isOutsideMonth(date)
    )
  }

  function getCellState(date: CalendarDate): GhostCalendarCellState {
    const value = modelValue.value
    if (selectionMode.value === 'single') {
      if (
        value instanceof CalendarDate &&
        isSameDay(toCalendarDate(value), date)
      ) {
        return 'selected'
      }
      return 'none'
    }
    if (!isCalendarRangeValue(value)) {
      return 'none'
    }
    const { start, end } = value
    if (
      isSameDay(toCalendarDate(start), date) &&
      isSameDay(toCalendarDate(end), date)
    ) {
      return 'selected'
    }
    if (isSameDay(toCalendarDate(start), date)) {
      return 'range-start'
    }
    if (isSameDay(toCalendarDate(end), date)) {
      return 'range-end'
    }
    if (isBetweenInclusive(date, toCalendarDate(start), toCalendarDate(end))) {
      return 'range-middle'
    }
    return 'none'
  }

  function isDateFocused(date: CalendarDate): boolean {
    return isSameDay(toCalendarDate(focusedDate.value), toCalendarDate(date))
  }

  function setVisibleMonth(month: CalendarDate, announce = true): void {
    const normalized = normalizeVisibleMonth(month)
    if (isSameMonth(normalized, visibleMonth.value)) {
      return
    }
    visibleMonth.value = normalized
    if (announce) {
      announceMonth.value = formatMonthYearLabel(normalized, locale.value)
    }
  }

  /** Selection proposal for an accepted activation of `date`. */
  function nextSelection(date: CalendarDate): GhostCalendarValue {
    if (selectionMode.value === 'single') {
      return date
    }

    const current = modelValue.value
    if (!isCalendarRangeValue(current)) {
      return { start: date, end: date }
    }

    const { start, end } = current
    const hasSpan = !isSameDay(start, end)
    if (!hasSpan) {
      const startDate = toCalendarDate(start)
      if (compareCalendarDate(date, startDate) < 0) {
        return { start: date, end: startDate }
      }
      return { start, end: date }
    }

    return { start: date, end: date }
  }

  function selectDate(date: CalendarDate): void {
    if (isDateSelectionDisabled(date)) {
      return
    }
    modelValue.value = nextSelection(date)
    setFocusedDate(date, { announce: false })
    // Fires after the model proposal so listeners see `update:modelValue`
    // first. A pending range start is shaped like a completed one-day range,
    // so wrappers that must tell the two apart count `select` activations
    // instead of reading the proposed value.
    options.onSelect?.(date)
  }

  function setFocusedDate(
    date: CalendarDate,
    opts?: { announce?: boolean },
  ): void {
    const normalizedDate = toCalendarDate(date)
    if (!isSameDay(normalizedDate, toCalendarDate(focusedDate.value))) {
      focusedDate.value = normalizedDate
    }
    if (
      !isSameMonth(normalizeVisibleMonth(normalizedDate), visibleMonth.value)
    ) {
      setVisibleMonth(normalizedDate, opts?.announce ?? true)
    }
  }

  function clampToFocusBounds(date: CalendarDate): CalendarDate {
    const normalized = toCalendarDate(date)
    if (minValue.value && compareCalendarDate(normalized, minValue.value) < 0) {
      return toCalendarDate(minValue.value)
    }
    if (maxValue.value && compareCalendarDate(normalized, maxValue.value) > 0) {
      return toCalendarDate(maxValue.value)
    }
    return normalized
  }

  /** Steps by day/week until the target is inside min/max, or give up at the bound. */
  function findInBoundsStep(
    from: CalendarDate,
    step: (date: CalendarDate) => CalendarDate,
  ): CalendarDate | undefined {
    let current = toCalendarDate(from)
    for (let attempt = 0; attempt < 366; attempt += 1) {
      const next = toCalendarDate(step(current))
      if (!isDateFocusDisabled(next)) {
        return next
      }
      if (
        minValue.value &&
        compareCalendarDate(next, minValue.value) < 0 &&
        compareCalendarDate(current, minValue.value) <= 0
      ) {
        return undefined
      }
      if (
        maxValue.value &&
        compareCalendarDate(next, maxValue.value) > 0 &&
        compareCalendarDate(current, maxValue.value) >= 0
      ) {
        return undefined
      }
      current = next
    }
    return undefined
  }

  function focusNextDay(reverse = false): void {
    const step = (date: CalendarDate) =>
      addCalendarDuration(date, reverse ? { days: -1 } : { days: 1 })
    const next = findInBoundsStep(toCalendarDate(focusedDate.value), step)
    if (next) {
      setFocusedDate(next)
    }
  }

  function focusNextWeek(reverse = false): void {
    const step = (date: CalendarDate) =>
      addCalendarDuration(date, reverse ? { weeks: -1 } : { weeks: 1 })
    const next = findInBoundsStep(toCalendarDate(focusedDate.value), step)
    if (next) {
      setFocusedDate(next)
    }
  }

  function localeWeekOptions(): Parameters<typeof startOfWeek>[2] | undefined {
    if (weekStartsOn.value === undefined) {
      return undefined
    }
    const weekStart = resolveWeekStartName(weekStartsOn.value)
    return weekStart as Parameters<typeof startOfWeek>[2]
  }

  function focusWeekBoundary(end = false): void {
    const weekOption = localeWeekOptions()
    const focused = toCalendarDate(focusedDate.value)
    const boundary = end
      ? toCalendarDate(
          weekOption
            ? endOfWeek(focused, locale.value, weekOption)
            : endOfWeek(focused, locale.value),
        )
      : toCalendarDate(
          weekOption
            ? startOfWeek(focused, locale.value, weekOption)
            : startOfWeek(focused, locale.value),
        )
    setFocusedDate(clampToFocusBounds(boundary))
  }

  function focusNextMonth(reverse = false): void {
    const nextFocus = addCalendarDuration(
      toCalendarDate(focusedDate.value),
      calendarDurationMonths(reverse ? -1 : 1),
    )
    setFocusedDate(nextFocus)
  }

  function focusNextYear(reverse = false): void {
    const nextFocus = addCalendarDuration(
      toCalendarDate(focusedDate.value),
      calendarDurationYears(reverse ? -1 : 1),
    )
    setFocusedDate(nextFocus)
  }

  function goToPreviousMonth(): void {
    setVisibleMonth(
      addCalendarDuration(visibleMonth.value, calendarDurationMonths(-1)),
    )
  }

  function goToNextMonth(): void {
    setVisibleMonth(
      addCalendarDuration(visibleMonth.value, calendarDurationMonths(1)),
    )
  }

  function registerHeadingId(id: string): void {
    headingId.value = id
  }

  function unregisterHeadingId(): void {
    headingId.value = undefined
  }

  return {
    modelValue,
    visibleMonth,
    selectionMode,
    locale,
    weekStartsOn,
    today,
    disabled,
    focusedDate,
    gridDates,
    weekRows,
    weekdayLabels,
    monthYearLabel,
    selectDate,
    isDateFocusDisabled,
    isDateUnavailable,
    isDateDisabledForInteraction,
    isDateSelectionDisabled,
    getCellState,
    isDateFocused,
    setFocusedDate,
    focusNextDay,
    focusNextWeek,
    focusWeekBoundary,
    focusNextMonth,
    focusNextYear,
    goToPreviousMonth,
    goToNextMonth,
    registerHeadingId,
    unregisterHeadingId,
    headingId,
    announceMonth,
  }
}
