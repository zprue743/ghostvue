import {
  CalendarDate as CalendarDateValue,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  type CalendarDate,
  type DateDuration,
  type DateValue,
  type DayOfWeek,
} from '@internationalized/date'

/*
 * `@internationalized/date` keys week starts by three-letter ids. Any other
 * string (for example `'sunday'`) is silently looked up as `undefined`, the
 * week offset becomes `NaN`, and `startOfWeek` returns the input date, so the
 * grid would start on the 1st instead of the locale's first weekday.
 */
const WEEK_START_NAMES = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const satisfies readonly DayOfWeek[]

export type CalendarWeekStartName = (typeof WEEK_START_NAMES)[number]

/** Map 0–6 (Sunday-based) to `@internationalized/date` week-start ids. */
export function resolveWeekStartName(
  weekStartsOn: number | undefined,
): CalendarWeekStartName | undefined {
  if (weekStartsOn === undefined) {
    return undefined
  }
  const name = WEEK_START_NAMES[weekStartsOn]
  if (!name) {
    return 'sun'
  }
  return name
}

/** Inclusive grid span for a month (typically 42 cells). */
export function getMonthGridDates(
  visibleMonth: CalendarDate,
  locale: string,
  weekStartsOn: number | undefined,
): CalendarDate[] {
  const monthStart = startOfMonth(visibleMonth)
  const monthEnd = endOfMonth(visibleMonth)
  const weekStart = resolveWeekStartName(weekStartsOn)
  let gridStart: CalendarDate
  let gridEnd: CalendarDate
  if (weekStart) {
    gridStart = toCalendarDate(startOfWeek(monthStart, locale, weekStart))
    gridEnd = toCalendarDate(endOfWeek(monthEnd, locale, weekStart))
  } else {
    gridStart = toCalendarDate(startOfWeek(monthStart, locale))
    gridEnd = toCalendarDate(endOfWeek(monthEnd, locale))
  }

  const dates: CalendarDate[] = []
  let current = gridStart
  while (current.compare(gridEnd) <= 0) {
    dates.push(current)
    current = toCalendarDate(current.add({ days: 1 }))
  }
  return dates
}

export function chunkWeekRows(dates: CalendarDate[]): CalendarDate[][] {
  const rows: CalendarDate[][] = []
  for (let index = 0; index < dates.length; index += 7) {
    rows.push(dates.slice(index, index + 7))
  }
  return rows
}

export function addCalendarDuration(
  date: CalendarDate,
  duration: DateDuration,
): CalendarDate {
  const next = date.add(duration)
  return new CalendarDateValue(next.year, next.month, next.day)
}

/** Normalize library date values to concrete `CalendarDate` instances. */
export function toCalendarDate(date: DateValue): CalendarDate {
  return new CalendarDateValue(date.year, date.month, date.day)
}

export function compareCalendarDate(
  left: CalendarDate,
  right: CalendarDate,
): number {
  return left.compare(right)
}

export function isCalendarSameDay(
  left: CalendarDate | undefined,
  right: CalendarDate | undefined,
): boolean {
  if (!left || !right) {
    return false
  }
  return isSameDay(left, right)
}

export function isCalendarSameMonth(
  date: CalendarDate,
  month: CalendarDate,
): boolean {
  return isSameMonth(date, month)
}

export function normalizeVisibleMonth(date: CalendarDate): CalendarDate {
  return toCalendarDate(startOfMonth(date))
}
