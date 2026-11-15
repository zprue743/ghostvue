import { CalendarDate, startOfWeek } from '@internationalized/date'
import { describe, expect, it } from 'vitest'

import { useGhostCalendar } from './use-ghost-calendar'

describe('useGhostCalendar keyboard focus', () => {
  it('moves to week start with focusWeekBoundary', () => {
    const anchor = new CalendarDate(2024, 6, 15)
    expect(startOfWeek(anchor, 'en-US').toString()).toBe('2024-06-09')
    const api = useGhostCalendar({
      defaultValue: new CalendarDate(2024, 6, 15),
      defaultVisibleMonth: new CalendarDate(2024, 6, 1),
      today: new CalendarDate(2024, 6, 10),
    })

    api.focusWeekBoundary(false)
    expect(api.focusedDate.value.toString()).toBe('2024-06-09')

    api.setFocusedDate(new CalendarDate(2024, 6, 15), { announce: false })
    api.focusWeekBoundary(true)
    expect(api.focusedDate.value.toString()).toBe('2024-06-15')
  })
})
