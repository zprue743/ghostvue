import { CalendarDate, CalendarDateTime } from '@internationalized/date'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'

import { parseIsoDate, toIsoDate } from './date-picker-value'
import type {
  GhostDatePickerRange,
  GhostDatePickerValue,
  UseGhostDatePickerOptions,
} from './ghost-date-picker'
import { useGhostDatePicker } from './use-ghost-date-picker'

const d = (year: number, month: number, day: number) =>
  new CalendarDate(year, month, day)

function describeValue(value: GhostDatePickerValue): string {
  if (value === null) return 'empty'
  if (value instanceof CalendarDate) return value.toString()
  return `${value.start.toString()}..${value.end.toString()}`
}

function setup(options: UseGhostDatePickerOptions = {}) {
  const onValueChange = vi.fn<(value: GhostDatePickerValue) => void>()
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const api = useGhostDatePicker({ onValueChange, onOpenChange, ...options })
  return { api, onValueChange, onOpenChange }
}

describe('strict ISO parsing', () => {
  it.each([
    ['2024-02-29', '2024-02-29'],
    ['2000-02-29', '2000-02-29'],
    ['0001-01-01', '0001-01-01'],
    ['9999-12-31', '9999-12-31'],
  ])('accepts %s', (text, expected) => {
    const parsed = parseIsoDate(text)
    expect(parsed && toIsoDate(parsed)).toBe(expected)
  })

  it.each([
    '2023-02-29',
    '1900-02-29',
    '2024-02-30',
    '2024-04-31',
    '2024-13-01',
    '2024-00-10',
    '0000-01-01',
    ' 2024-01-01',
    '2024-01-01 ',
    '2024-1-01',
    '24-01-01',
    '2024/01/01',
    '01/02/2024',
    '2024-01-01T00:00',
    '+02024-01-01',
  ])('rejects %j', (text) => {
    expect(parseIsoDate(text)).toBeNull()
  })
})

describe('useGhostDatePicker text drafts (single)', () => {
  it('keeps exact draft text without updating the model until commit', () => {
    const { api, onValueChange } = setup()
    api.setDraft('single', '2024-6')
    expect(api.displayText('single')).toBe('2024-6')
    expect(api.value.value).toBeNull()
    expect(api.pending.value).toBe(true)
    expect(api.errors.value).toEqual([])
    expect(onValueChange).not.toHaveBeenCalled()
    // Native validity blocks submission before any visible error appears.
    expect(api.validityMessage('single')).toBe('Confirm this date')
  })

  it('commits valid text, formats display, and never re-emits an equal date', () => {
    const { api, onValueChange } = setup()
    api.setDraft('single', '2024-06-14')
    expect(api.commitText()).toBe(true)
    expect(describeValue(api.value.value)).toBe('2024-06-14')
    expect(onValueChange).toHaveBeenCalledTimes(1)

    api.setDraft('single', '2024-06-14')
    expect(api.commitText()).toBe(true)
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(api.pending.value).toBe(false)
  })

  it('keeps invalid text and the committed value, and reports a parse error', () => {
    const { api, onValueChange } = setup({ defaultValue: d(2024, 6, 1) })
    api.setDraft('single', '2023-02-29')
    expect(api.commitText()).toBe(false)
    expect(api.displayText('single')).toBe('2023-02-29')
    expect(describeValue(api.value.value)).toBe('2024-06-01')
    expect(api.errors.value.map((error) => error.code)).toEqual(['parse'])
    expect(api.validityMessage('single')).toBe(
      'Enter a valid date (YYYY-MM-DD)',
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('rejects out-of-bounds and unavailable dates without clamping', () => {
    const { api } = setup({
      minValue: d(2024, 6, 1),
      maxValue: d(2024, 6, 30),
      isDateDisabled: () => (date) => date.day === 15,
    })
    api.setDraft('single', '2024-05-31')
    api.commitText()
    expect(api.errors.value[0]).toMatchObject({ code: 'min', part: 'single' })
    expect(api.errors.value[0]?.message).toBe(
      'Choose a date on or after 2024-06-01',
    )
    api.setDraft('single', '2024-07-01')
    api.commitText()
    expect(api.errors.value[0]?.code).toBe('max')
    api.setDraft('single', '2024-06-15')
    api.commitText()
    expect(api.errors.value[0]?.code).toBe('unavailable')
    expect(api.value.value).toBeNull()
  })

  it('commits null when the text is cleared', () => {
    const { api, onValueChange } = setup({ defaultValue: d(2024, 6, 1) })
    api.setDraft('single', '')
    expect(api.commitText()).toBe(true)
    expect(api.value.value).toBeNull()
    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it('reverts text and clears draft errors on revert (Escape)', () => {
    const { api } = setup({ defaultValue: d(2024, 6, 1) })
    api.setDraft('single', 'nope')
    api.commitText()
    api.revertText()
    expect(api.displayText('single')).toBe('2024-06-01')
    expect(api.errors.value).toEqual([])
  })

  it('treats a throwing parse callback as an invalid draft', () => {
    const { api } = setup({
      parse: () => () => {
        throw new Error('boom')
      },
    })
    api.setDraft('single', 'anything')
    expect(api.commitText()).toBe(false)
    expect(api.errors.value[0]?.code).toBe('parse')
  })

  it('rejects date-time values returned by a custom parser', () => {
    const { api } = setup({
      // Untyped callers can return other date classes at runtime.
      parse: () => () =>
        new CalendarDateTime(2024, 6, 1, 10) as unknown as CalendarDate,
    })
    api.setDraft('single', 'x')
    expect(api.commitText()).toBe(false)
    expect(api.errors.value[0]?.code).toBe('parse')
  })

  it('falls back to ISO with a development diagnostic when format throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { api } = setup({
      defaultValue: d(2024, 6, 1),
      format: () => () => {
        throw new Error('boom')
      },
    })
    expect(api.displayText('single')).toBe('2024-06-01')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GHOST004'))
    warn.mockRestore()
  })

  it('uses custom parse/format with the locale and part context', () => {
    const parse = vi.fn((text: string) => {
      const [day, month, year] = text.split('.').map(Number)
      return day && month && year ? d(year, month, day) : null
    })
    const format = vi.fn(
      (date: CalendarDate) =>
        `${String(date.day).padStart(2, '0')}.${String(date.month).padStart(2, '0')}.${String(date.year)}`,
    )
    const { api } = setup({
      locale: 'de-DE',
      parse: () => parse,
      format: () => format,
    })
    api.setDraft('single', '14.06.2024')
    api.commitText()
    expect(describeValue(api.value.value)).toBe('2024-06-14')
    expect(api.displayText('single')).toBe('14.06.2024')
    expect(parse).toHaveBeenCalledWith('14.06.2024', {
      locale: 'de-DE',
      part: 'single',
    })
  })

  it('localizes messages through validationMessage', () => {
    const { api } = setup({
      validationMessage: () => (error) => `[${error.code}]`,
    })
    api.setDraft('single', 'x')
    api.commitText()
    expect(api.errors.value[0]?.message).toBe('[parse]')
    expect(api.validityMessage('single')).toBe('[parse]')
  })
})

describe('useGhostDatePicker ranges', () => {
  it('reports one cleared endpoint as incomplete and keeps the committed pair', () => {
    const initial = { start: d(2024, 6, 1), end: d(2024, 6, 5) }
    const { api } = setup({ selectionMode: 'range', defaultValue: initial })
    api.setDraft('end', '')
    expect(api.commitText()).toBe(false)
    expect(api.errors.value).toMatchObject([
      { code: 'incomplete', part: 'end' },
    ])
    expect(api.value.value).toBe(initial)
  })

  it('never swaps reversed typed endpoints', () => {
    const { api } = setup({ selectionMode: 'range' })
    api.setDraft('start', '2024-06-10')
    api.setDraft('end', '2024-06-01')
    expect(api.commitText()).toBe(false)
    expect(api.errors.value).toMatchObject([
      { code: 'range-order', part: 'range' },
    ])
    expect(api.value.value).toBeNull()
  })

  it('commits a typed range and clears both inputs to commit null', () => {
    const { api } = setup({ selectionMode: 'range' })
    api.setDraft('start', '2024-06-01')
    api.setDraft('end', '2024-06-01')
    expect(api.commitText()).toBe(true)
    expect(describeValue(api.value.value)).toBe('2024-06-01..2024-06-01')
    api.setDraft('start', '')
    api.setDraft('end', '')
    expect(api.commitText()).toBe(true)
    expect(api.value.value).toBeNull()
  })

  it('applies validateRange after endpoint checks', () => {
    const validateRange = vi.fn((range: GhostDatePickerRange) =>
      range.end.compare(range.start) > 7
        ? 'Stays are limited to 7 nights'
        : null,
    )
    const { api } = setup({
      selectionMode: 'range',
      validateRange: () => validateRange,
    })
    api.setDraft('start', '2024-06-01')
    api.setDraft('end', '2024-06-20')
    expect(api.commitText()).toBe(false)
    expect(api.errors.value[0]).toMatchObject({
      code: 'range-validation',
      message: 'Stays are limited to 7 nights',
    })
  })

  it('commits a range atomically after two calendar activations', () => {
    const { api, onValueChange, onOpenChange } = setup({
      selectionMode: 'range',
      defaultOpen: true,
    })
    api.selectCalendarDate(d(2024, 6, 12))
    expect(api.anchor.value?.toString()).toBe('2024-06-12')
    expect(api.value.value).toBeNull()
    expect(api.isOpen.value).toBe(true)
    expect(describeValue(api.calendarValue.value)).toBe(
      '2024-06-12..2024-06-12',
    )
    // An earlier second endpoint is sorted, not rejected.
    api.selectCalendarDate(d(2024, 6, 3))
    expect(describeValue(api.value.value)).toBe('2024-06-03..2024-06-12')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(api.anchor.value).toBeNull()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('commits a one-day range on two clicks and restarts cleanly over it', () => {
    const { api } = setup({ selectionMode: 'range', defaultOpen: true })
    api.selectCalendarDate(d(2024, 6, 12))
    api.selectCalendarDate(d(2024, 6, 12))
    expect(describeValue(api.value.value)).toBe('2024-06-12..2024-06-12')

    api.openCalendar()
    api.selectCalendarDate(d(2024, 6, 20))
    // The committed one-day range is not extended: a new anchor starts.
    expect(api.anchor.value?.toString()).toBe('2024-06-20')
    expect(describeValue(api.value.value)).toBe('2024-06-12..2024-06-12')
  })

  it('keeps the anchor and open state after an invalid second activation', () => {
    const { api } = setup({
      selectionMode: 'range',
      defaultOpen: true,
      validateRange: () => () => 'Not allowed',
    })
    api.selectCalendarDate(d(2024, 6, 1))
    api.selectCalendarDate(d(2024, 6, 4))
    expect(api.value.value).toBeNull()
    expect(api.anchor.value?.toString()).toBe('2024-06-01')
    expect(api.isOpen.value).toBe(true)
    expect(api.calendarError.value?.message).toBe('Not allowed')
  })

  it('cancels calendar progress on close without touching typed drafts', () => {
    const { api } = setup({ selectionMode: 'range', defaultOpen: true })
    api.setDraft('start', '2024-06-0')
    api.selectCalendarDate(d(2024, 6, 1))
    api.close()
    expect(api.anchor.value).toBeNull()
    expect(api.displayText('start')).toBe('2024-06-0')
  })

  it('revalidates a pending anchor when constraints change', async () => {
    const disabled = shallowRef<((date: CalendarDate) => boolean) | undefined>(
      undefined,
    )
    const { api } = setup({
      selectionMode: 'range',
      defaultOpen: true,
      isDateDisabled: disabled,
    })
    api.selectCalendarDate(d(2024, 6, 1))
    disabled.value = (date) => date.day === 1
    await nextTick()
    expect(api.anchor.value).toBeNull()
  })
})

describe('useGhostDatePicker controlled state', () => {
  it('reconciles to the parent when a valid proposal is ignored', () => {
    const model = shallowRef<GhostDatePickerValue | undefined>(d(2024, 1, 1))
    const { api, onValueChange } = setup({ modelValue: model })
    api.setDraft('single', '2024-06-14')
    api.commitText()
    expect(onValueChange).toHaveBeenCalledTimes(1)
    // Parent ignored the proposal: the display shows the parent's value.
    expect(api.displayText('single')).toBe('2024-01-01')
  })

  it('replaces drafts and cancels range progress on a material external change', async () => {
    const model = shallowRef<GhostDatePickerValue | undefined>(null)
    const { api, onValueChange } = setup({
      selectionMode: 'range',
      modelValue: model,
      defaultOpen: true,
    })
    api.setDraft('start', '2024-0')
    api.selectCalendarDate(d(2024, 6, 1))
    model.value = { start: d(2024, 7, 1), end: d(2024, 7, 2) }
    await nextTick()
    expect(api.displayText('start')).toBe('2024-07-01')
    expect(api.anchor.value).toBeNull()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('reports a wrong-shaped value as a configuration error without inferring the mode', () => {
    const { api } = setup({
      selectionMode: 'single',
      modelValue: { start: d(2024, 1, 1), end: d(2024, 1, 2) },
    })
    expect(api.errors.value.map((error) => error.code)).toEqual([
      'configuration',
    ])
    expect(api.displayText('single')).toBe('')
    expect(api.validityMessage('single')).not.toBe('')
  })

  it('flags min > max as configuration and blocks selection', () => {
    const { api, onValueChange } = setup({
      minValue: d(2024, 6, 10),
      maxValue: d(2024, 6, 1),
      defaultOpen: true,
    })
    expect(api.hasConfigurationError.value).toBe(true)
    api.selectCalendarDate(d(2024, 6, 5))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('shows external values that break constraints without rewriting them', () => {
    const value = d(2024, 5, 1)
    const { api, onValueChange } = setup({
      modelValue: value,
      minValue: d(2024, 6, 1),
    })
    expect(api.displayText('single')).toBe('2024-05-01')
    expect(api.errors.value[0]?.code).toBe('min')
    expect(api.value.value).toBe(value)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('combines the invalid prop as external-invalid', () => {
    const { api } = setup({ invalid: true })
    expect(api.errors.value.map((error) => error.code)).toEqual([
      'external-invalid',
    ])
  })

  it('shows required and uncommitted errors only after validation is attempted', () => {
    const { api } = setup({ required: true })
    expect(api.errors.value).toEqual([])
    api.markValidationAttempted()
    expect(api.errors.value.map((error) => error.code)).toEqual(['required'])
    api.setDraft('single', '2024')
    expect(api.errors.value.map((error) => error.code)).toEqual(['uncommitted'])
  })
})

describe('useGhostDatePicker open state', () => {
  it('derives effective open from disabled/readonly and requests close on entry', async () => {
    const disabled = shallowRef(false)
    const open = shallowRef<boolean | undefined>(true)
    const { api, onOpenChange } = setup({ open, disabled })
    expect(api.isOpen.value).toBe(true)
    disabled.value = true
    expect(api.isOpen.value).toBe(false)
    await nextTick()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    // The parent kept `open: true`; re-enabling follows it.
    disabled.value = false
    expect(api.isOpen.value).toBe(true)
  })

  it('does not open while readonly and ignores edits', () => {
    const { api, onOpenChange } = setup({ readonly: true })
    api.openCalendar()
    expect(onOpenChange).not.toHaveBeenCalled()
    api.setDraft('single', '2024-01-01')
    expect(api.displayText('single')).toBe('')
    api.clear()
    expect(api.value.value).toBeNull()
  })

  it('leaves the requested state open when a controlled parent ignores close', () => {
    const { api, onOpenChange } = setup({ open: true })
    api.close()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(api.isOpen.value).toBe(true)
  })
})

describe('useGhostDatePicker focus and month', () => {
  it('starts on the committed date, then today, then the first of the month, clamped', () => {
    expect(
      setup({
        defaultValue: d(2024, 6, 14),
      }).api.initialFocusDate.value?.toString(),
    ).toBe('2024-06-14')
    expect(
      setup({ today: d(2026, 11, 17) }).api.initialFocusDate.value?.toString(),
    ).toBe('2026-11-17')
    const other = setup({
      today: d(2026, 11, 17),
      defaultVisibleMonth: d(2026, 3, 9),
    }).api
    expect(other.initialVisibleMonth.value?.toString()).toBe('2026-03-09')
    expect(other.initialFocusDate.value?.toString()).toBe('2026-03-01')
    expect(
      setup({
        today: d(2026, 11, 17),
        minValue: d(2026, 11, 20),
      }).api.initialFocusDate.value?.toString(),
    ).toBe('2026-11-20')
  })
})

describe('useGhostDatePicker form reset', () => {
  it('restores the captured default in uncontrolled mode and clears progress', () => {
    const { api, onOpenChange } = setup({
      defaultValue: d(2024, 1, 1),
      defaultOpen: true,
      selectionMode: 'single',
    })
    api.setDraft('single', '2024-06-14')
    api.commitText()
    api.setDraft('single', 'bad')
    api.applyFormReset()
    expect(describeValue(api.value.value)).toBe('2024-01-01')
    expect(api.displayText('single')).toBe('2024-01-01')
    expect(api.errors.value).toEqual([])
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('restores the current props without emitting in controlled mode', () => {
    const { api, onValueChange } = setup({ modelValue: d(2024, 3, 3) })
    api.setDraft('single', 'bad')
    api.applyFormReset()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(api.displayText('single')).toBe('2024-03-03')
  })
})
