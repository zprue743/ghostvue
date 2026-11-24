import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'

import { resolveLocaleWeekStart } from './calendar-intl'
import {
  chunkWeekRows,
  getMonthGridDates,
  resolveWeekStartName,
} from './calendar-date-math'

const june2024 = new CalendarDate(2024, 6, 1)

function gridFor(locale: string, weekStartsOn?: number) {
  // Mirrors `useGhostCalendar`: the effective start is always resolved first.
  const start = weekStartsOn ?? resolveLocaleWeekStart(locale)
  return chunkWeekRows(getMonthGridDates(june2024, locale, start))
}

describe('calendar date math', () => {
  it('maps Sunday-based indexes to @internationalized/date week ids', () => {
    expect(resolveWeekStartName(undefined)).toBeUndefined()
    expect(
      [0, 1, 2, 3, 4, 5, 6].map((index) => resolveWeekStartName(index)),
    ).toEqual(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
  })

  it('starts June 2024 on Saturday in en-US (Sunday-first weeks)', () => {
    const weeks = gridFor('en-US')
    // June 30 is a Sunday, so en-US needs a sixth row for Jun 30 – Jul 6.
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    // The first row starts on Sunday May 26; June 1 sits in the Saturday column.
    expect(weeks[0]?.[0]?.toString()).toBe('2024-05-26')
    expect(weeks[0]?.[6]?.toString()).toBe('2024-06-01')
    expect(weeks[5]?.[0]?.toString()).toBe('2024-06-30')
    expect(weeks[5]?.[6]?.toString()).toBe('2024-07-06')
  })

  it('uses Monday-first weeks for en-GB', () => {
    const weeks = gridFor('en-GB')
    expect(weeks[0]?.[0]?.toString()).toBe('2024-05-27')
    expect(weeks[0]?.[5]?.toString()).toBe('2024-06-01')
    // Monday-first weeks end on Sunday June 30, so five rows suffice.
    expect(weeks).toHaveLength(5)
    expect(weeks.at(-1)?.at(-1)?.toString()).toBe('2024-06-30')
  })

  it('honors an explicit weekStartsOn over the locale', () => {
    const weeks = gridFor('en-US', 1)
    expect(weeks[0]?.[0]?.toString()).toBe('2024-05-27')
    expect(gridFor('en-GB', 0)[0]?.[0]?.toString()).toBe('2024-05-26')
  })
})
