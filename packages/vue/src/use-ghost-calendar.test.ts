import { CalendarDate, startOfWeek } from '@internationalized/date'
import { describe, expect, it, vi } from 'vitest'
import { ref, shallowRef } from 'vue'

import { isCalendarRangeValue, type GhostCalendarValue } from './ghost-calendar'
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

interface RangeValue {
  start: CalendarDate
  end: CalendarDate
}

function describeValue(value: GhostCalendarValue): string {
  if (value === undefined) {
    return 'empty'
  }
  if (isCalendarRangeValue(value)) {
    return `${value.start.toString()}..${value.end.toString()}`
  }
  return value.toString()
}

const JUNE_2024 = new CalendarDate(2024, 6, 1)

describe('useGhostCalendar select callback', () => {
  it('calls onSelect once per accepted activation, after the model proposal', () => {
    const log: string[] = []
    const api = useGhostCalendar({
      defaultVisibleMonth: JUNE_2024,
      onValueChange: (value) => log.push(`value:${describeValue(value)}`),
      onSelect: (date) => log.push(`select:${date.toString()}`),
    })

    api.selectDate(new CalendarDate(2024, 6, 3))
    api.selectDate(new CalendarDate(2024, 6, 9))

    expect(log).toEqual([
      'value:2024-06-03',
      'select:2024-06-03',
      'value:2024-06-09',
      'select:2024-06-09',
    ])
  })

  it('fires for repeated activation of the already selected single date', () => {
    const selected: string[] = []
    const day = new CalendarDate(2024, 6, 12)
    const api = useGhostCalendar({
      defaultValue: day,
      onSelect: (date) => selected.push(date.toString()),
    })

    api.selectDate(day)
    api.selectDate(new CalendarDate(2024, 6, 12))

    expect(selected).toEqual(['2024-06-12', '2024-06-12'])
    expect(describeValue(api.modelValue.value)).toBe('2024-06-12')
  })

  it('distinguishes a pending range start from a completed same-day range', () => {
    const log: string[] = []
    const api = useGhostCalendar({
      selectionMode: 'range',
      defaultVisibleMonth: JUNE_2024,
      onValueChange: (value) => log.push(`value:${describeValue(value)}`),
      onSelect: (date) => log.push(`select:${date.toString()}`),
    })

    const day = new CalendarDate(2024, 6, 14)
    api.selectDate(day)
    api.selectDate(day)

    // Both proposals have the same one-day shape; only the select count tells
    // the first activation apart from the second.
    expect(log).toEqual([
      'value:2024-06-14..2024-06-14',
      'select:2024-06-14',
      'value:2024-06-14..2024-06-14',
      'select:2024-06-14',
    ])
  })

  it('emits nothing for disabled, unavailable, or outside-month activations', () => {
    const onSelect = vi.fn()
    const onValueChange = vi.fn()
    const disabled = ref(false)
    const api = useGhostCalendar({
      defaultVisibleMonth: JUNE_2024,
      minValue: new CalendarDate(2024, 6, 5),
      maxValue: new CalendarDate(2024, 6, 25),
      // MaybeRefOrGetter: a bare function would be read as a getter.
      isDateDisabled: () => (date: CalendarDate) => date.day === 12,
      disabled,
      onSelect,
      onValueChange,
    })

    api.selectDate(new CalendarDate(2024, 6, 4))
    api.selectDate(new CalendarDate(2024, 6, 26))
    api.selectDate(new CalendarDate(2024, 6, 12))
    api.selectDate(new CalendarDate(2024, 7, 1))
    disabled.value = true
    api.selectDate(new CalendarDate(2024, 6, 15))

    expect(onSelect).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(api.modelValue.value).toBeUndefined()
  })

  it('keeps existing range transitions and proposals unchanged', () => {
    const proposals: string[] = []
    const api = useGhostCalendar({
      selectionMode: 'range',
      defaultVisibleMonth: JUNE_2024,
      onValueChange: (value) => proposals.push(describeValue(value)),
    })

    api.selectDate(new CalendarDate(2024, 6, 10))
    api.selectDate(new CalendarDate(2024, 6, 14))
    api.selectDate(new CalendarDate(2024, 6, 20))
    api.selectDate(new CalendarDate(2024, 6, 8))

    expect(proposals).toEqual([
      '2024-06-10..2024-06-10',
      '2024-06-10..2024-06-14',
      '2024-06-20..2024-06-20',
      '2024-06-08..2024-06-20',
    ])
  })
})

describe('useGhostCalendar controlled-empty modelValue', () => {
  it('treats null as controlled empty and ignores unapplied proposals', () => {
    const proposals: GhostCalendarValue[] = []
    const onSelect = vi.fn()
    const api = useGhostCalendar({
      modelValue: null,
      defaultValue: new CalendarDate(2024, 3, 9),
      defaultVisibleMonth: JUNE_2024,
      onValueChange: (value) => proposals.push(value),
      onSelect,
    })

    expect(api.modelValue.value).toBeUndefined()
    api.selectDate(new CalendarDate(2024, 6, 18))

    expect(proposals.map(describeValue)).toEqual(['2024-06-18'])
    expect(onSelect).toHaveBeenCalledOnce()
    expect(api.modelValue.value).toBeUndefined()
    expect(api.getCellState(new CalendarDate(2024, 6, 18))).toBe('none')
  })

  it('does not seed month or focus from defaultValue when controlled empty', () => {
    const api = useGhostCalendar({
      modelValue: null,
      defaultValue: new CalendarDate(2024, 3, 9),
      today: new CalendarDate(2024, 8, 20),
    })

    // Falls through to the deterministic January 2024 month and `today`
    // focus, exactly like an uncontrolled calendar without a default.
    expect(api.visibleMonth.value.toString()).toBe('2024-01-01')
    expect(api.focusedDate.value.toString()).toBe('2024-08-20')
  })

  it('keeps uncontrolled undefined seeding from defaultValue', () => {
    const api = useGhostCalendar({
      modelValue: undefined,
      defaultValue: new CalendarDate(2024, 3, 9),
      today: new CalendarDate(2024, 8, 20),
    })

    expect(describeValue(api.modelValue.value)).toBe('2024-03-09')
    expect(api.visibleMonth.value.toString()).toBe('2024-03-01')
  })

  it('clears a pending range back to empty when the parent sets null', () => {
    const model = shallowRef<RangeValue | null>(null)
    const proposals: string[] = []
    const api = useGhostCalendar({
      modelValue: model,
      selectionMode: 'range',
      defaultVisibleMonth: JUNE_2024,
      onValueChange: (value) => {
        proposals.push(describeValue(value))
        model.value = isCalendarRangeValue(value)
          ? {
              start: new CalendarDate(2024, 6, value.start.day),
              end: new CalendarDate(2024, 6, value.end.day),
            }
          : null
      },
    })

    api.selectDate(new CalendarDate(2024, 6, 10))
    expect(api.getCellState(new CalendarDate(2024, 6, 10))).toBe('selected')

    model.value = null
    expect(api.modelValue.value).toBeUndefined()
    expect(api.getCellState(new CalendarDate(2024, 6, 10))).toBe('none')

    // With the pending start cleared, the next activation starts a new range
    // instead of completing the discarded one.
    api.selectDate(new CalendarDate(2024, 6, 16))
    expect(proposals).toEqual([
      '2024-06-10..2024-06-10',
      '2024-06-16..2024-06-16',
    ])
  })

  it('does not propose a change when undefined is written over controlled null', () => {
    const onValueChange = vi.fn()
    const api = useGhostCalendar({ modelValue: null, onValueChange })

    api.modelValue.value = undefined

    expect(onValueChange).not.toHaveBeenCalled()
    expect(api.modelValue.value).toBeUndefined()
  })

  it('normalizes null to undefined in emitted proposals when clearing', () => {
    const onValueChange = vi.fn()
    const api = useGhostCalendar({
      modelValue: new CalendarDate(2024, 6, 4),
      onValueChange,
    })

    api.modelValue.value = undefined

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(undefined)
  })
})
