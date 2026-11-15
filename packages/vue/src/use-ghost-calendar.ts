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

function initialVisibleMonth(options: UseGhostCalendarOptions): CalendarDate {
  const explicit = toValue(options.visibleMonth)
  if (explicit) {
    return normalizeVisibleMonth(explicit)
  }
  const fallback = toValue(options.defaultVisibleMonth)
  if (fallback) {
    return normalizeVisibleMonth(fallback)
  }
  const selection = toValue(options.modelValue) ?? toValue(options.defaultValue)
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
  const selection = toValue(options.modelValue) ?? toValue(options.defaultValue)
  if (selection instanceof CalendarDate) {
    return toCalendarDate(selection)
  }
  if (isCalendarRangeValue(selection)) {
    return toCalendarDate(selection.start)
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
  const modelValue = useControllableState<GhostCalendarValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    onChange: (next) => {
      options.onValueChange?.(next)
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

  function isDateDisabledForInteraction(date: CalendarDate): boolean {
    if (disabled.value) {
      return true
    }
    if (minValue.value && compareCalendarDate(date, minValue.value) < 0) {
      return true
    }
    if (maxValue.value && compareCalendarDate(date, maxValue.value) > 0) {
      return true
    }
    const custom = isDateDisabled.value
    if (custom?.(date)) {
      return true
    }
    return false
  }

  function isDateSelectionDisabled(date: CalendarDate): boolean {
    return isDateDisabledForInteraction(date) || isOutsideMonth(date)
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

  function selectDate(date: CalendarDate): void {
    if (isDateSelectionDisabled(date)) {
      return
    }
    if (selectionMode.value === 'single') {
      modelValue.value = date
      setFocusedDate(date, { announce: false })
      return
    }

    const current = modelValue.value
    if (!isCalendarRangeValue(current)) {
      modelValue.value = { start: date, end: date }
      setFocusedDate(date, { announce: false })
      return
    }

    const { start, end } = current
    const hasSpan = !isSameDay(start, end)
    if (!hasSpan) {
      const startDate = toCalendarDate(start)
      if (compareCalendarDate(date, startDate) < 0) {
        modelValue.value = { start: date, end: startDate }
      } else {
        modelValue.value = { start, end: date }
      }
      setFocusedDate(date, { announce: false })
      return
    }

    modelValue.value = { start: date, end: date }
    setFocusedDate(date, { announce: false })
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

  function findEnabledStep(
    from: CalendarDate,
    step: (date: CalendarDate) => CalendarDate,
    reverse = false,
  ): CalendarDate | undefined {
    let current = toCalendarDate(from)
    for (let attempt = 0; attempt < 366; attempt += 1) {
      current = toCalendarDate(reverse ? step(current) : step(current))
      if (!isDateDisabledForInteraction(current)) {
        return current
      }
    }
    return undefined
  }

  function focusNextDay(reverse = false): void {
    const step = (date: CalendarDate) =>
      addCalendarDuration(date, reverse ? { days: -1 } : { days: 1 })
    const next = findEnabledStep(toCalendarDate(focusedDate.value), step, false)
    if (next) {
      setFocusedDate(next)
    }
  }

  function focusNextWeek(reverse = false): void {
    const step = (date: CalendarDate) =>
      addCalendarDuration(date, reverse ? { weeks: -1 } : { weeks: 1 })
    const next = findEnabledStep(toCalendarDate(focusedDate.value), step, false)
    if (next) {
      setFocusedDate(next)
    }
  }

  function focusWeekBoundary(end = false): void {
    const weekStart = resolveWeekStartName(effectiveWeekStart.value)
    const weekStartArg = weekStart as Parameters<typeof startOfWeek>[2]
    const start = toCalendarDate(
      weekStart
        ? startOfWeek(
            toCalendarDate(focusedDate.value),
            locale.value,
            weekStartArg,
          )
        : startOfWeek(toCalendarDate(focusedDate.value), locale.value),
    )
    const boundary = end
      ? toCalendarDate(
          weekStart
            ? endOfWeek(
                toCalendarDate(focusedDate.value),
                locale.value,
                weekStartArg,
              )
            : endOfWeek(toCalendarDate(focusedDate.value), locale.value),
        )
      : start
    const target = isDateDisabledForInteraction(boundary)
      ? (findEnabledStep(boundary, (date) =>
          addCalendarDuration(date, { days: 1 }),
        ) ?? boundary)
      : boundary
    setFocusedDate(target)
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
