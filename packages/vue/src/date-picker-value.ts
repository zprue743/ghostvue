/**
 * Internal date-only value helpers for GhostDatePicker: strict ISO text,
 * runtime shape checks, and value identity. Not exported from the barrel.
 */
import { CalendarDate } from '@internationalized/date'

import type {
  GhostDatePickerRange,
  GhostDatePickerSelectionMode,
} from './ghost-date-picker'

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Public values are Gregorian date-only `CalendarDate`s in years 0001–9999.
 * `instanceof` rejects `CalendarDateTime` / `ZonedDateTime` (separate classes),
 * JavaScript `Date`, and strings that reach the picker from untyped callers.
 */
export function isPickerDate(value: unknown): value is CalendarDate {
  return (
    value instanceof CalendarDate &&
    value.calendar.identifier === 'gregory' &&
    value.era === 'AD' &&
    value.year >= 1 &&
    value.year <= 9999
  )
}

export function isPickerRange(value: unknown): value is GhostDatePickerRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof CalendarDate) &&
    'start' in value &&
    'end' in value &&
    isPickerDate(value.start) &&
    isPickerDate(value.end)
  )
}

/**
 * Whether `value` has the shape `mode` requires. The mode is never inferred
 * from the value; a mismatch is a `configuration` error.
 */
export function hasValidShape(
  value: unknown,
  mode: GhostDatePickerSelectionMode,
): boolean {
  if (value === null) {
    return true
  }
  return mode === 'single' ? isPickerDate(value) : isPickerRange(value)
}

/** ISO `YYYY-MM-DD`, zero-padded to four year digits. */
export function toIsoDate(date: CalendarDate): string {
  const year = String(date.year).padStart(4, '0')
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Strict ISO parser: exactly `YYYY-MM-DD`, no whitespace, zero-padded, year
 * 0001–9999, and a real calendar day. `CalendarDate` silently constrains
 * impossible days (Feb 30 becomes Feb 29/28), so the day is range-checked
 * against the month before constructing the value.
 */
export function parseIsoDate(text: string): CalendarDate | null {
  const match = ISO_DATE_RE.exec(text)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return null
  }
  const firstOfMonth = new CalendarDate(year, month, 1)
  if (day > firstOfMonth.calendar.getDaysInMonth(firstOfMonth)) {
    return null
  }
  return new CalendarDate(year, month, day)
}

/**
 * Stable identity key used to suppress duplicate `update:modelValue` events
 * and to detect material external changes. Wrong-shaped values get a key that
 * never equals a valid one.
 */
export function valueKey(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (isPickerDate(value)) {
    return toIsoDate(value)
  }
  if (isPickerRange(value)) {
    return `${toIsoDate(value.start)}/${toIsoDate(value.end)}`
  }
  return 'invalid'
}
