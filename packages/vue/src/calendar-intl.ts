import type { CalendarDate } from '@internationalized/date'

import { CalendarDate as CalendarDateValue } from '@internationalized/date'

/** ECMA `weekInfo.firstDay` (1=Mon … 7=Sun) to Sunday-based 0–6. */
export function resolveLocaleWeekStart(locale: string): number {
  try {
    const localeValue = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: { firstDay?: number }
    }
    const firstDay = localeValue.weekInfo?.firstDay
    if (firstDay !== undefined) {
      return firstDay === 7 ? 0 : firstDay
    }
  } catch {
    // Locales without weekInfo fall back to Sunday.
  }
  return 0
}

/** Weekday labels for the column header row (short, locale-aware). */
export function formatWeekdayLabels(
  locale: string,
  weekStartsOn: number | undefined,
): string[] {
  const startOffset = weekStartsOn ?? resolveLocaleWeekStart(locale)
  const anchor = new CalendarDateValue(2024, 1, 7 + startOffset)
  const labels: string[] = []
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  for (let index = 0; index < 7; index += 1) {
    const date = anchor.add({ days: index })
    const js = new Date(date.year, date.month - 1, date.day)
    labels.push(formatter.format(js))
  }
  return labels
}

export function formatMonthYearLabel(
  month: CalendarDate,
  locale: string,
): string {
  const js = new Date(month.year, month.month - 1, 1)
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(js)
}

export function formatCalendarDateLabel(
  date: CalendarDate,
  locale: string,
): string {
  const js = new Date(date.year, date.month - 1, date.day)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(js)
}
