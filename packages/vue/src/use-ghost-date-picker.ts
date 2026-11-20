import type { CalendarDate } from '@internationalized/date'
import { computed, shallowRef, toValue, watch } from 'vue'

import {
  hasValidShape,
  isPickerDate,
  isPickerRange,
  parseIsoDate,
  toIsoDate,
  valueKey,
} from './date-picker-value'
import { logGhostCode } from './dev-codes'
import type {
  GhostDatePickerError,
  GhostDatePickerErrorCode,
  GhostDatePickerPart,
  GhostDatePickerRange,
  GhostDatePickerSelectionMode,
  GhostDatePickerValue,
  UseGhostDatePickerOptions,
  UseGhostDatePickerReturn,
} from './ghost-date-picker'
import { useControllableState } from './use-controllable-state'

type Drafts = Partial<Record<GhostDatePickerPart, string>>

type ParsedText =
  { date: CalendarDate; error?: undefined } | { error: GhostDatePickerError }

const RANGE_PARTS = ['start', 'end'] as const

function startOf(value: GhostDatePickerValue): CalendarDate | undefined {
  if (isPickerDate(value)) {
    return value
  }
  return isPickerRange(value) ? value.start : undefined
}

/**
 * Headless DatePicker state: committed model, raw text drafts per input, the
 * pending calendar range anchor, validation, and open state.
 *
 * The three concepts stay separate on purpose (spec "State model"): text is
 * never reformatted while it is a draft, invalid drafts never replace the
 * committed value, and calendar range progress never touches either until the
 * second activation commits atomically.
 */
export function useGhostDatePicker(
  options: UseGhostDatePickerOptions = {},
): UseGhostDatePickerReturn {
  // Captured once: the selection mode is fixed per instance, and an
  // uncontrolled form reset restores the initial default, not a later prop.
  const mode: GhostDatePickerSelectionMode =
    toValue(options.selectionMode) ?? 'single'
  const resetValue: GhostDatePickerValue = toValue(options.defaultValue) ?? null

  const value = useControllableState<GhostDatePickerValue>({
    prop: () => toValue(options.modelValue),
    defaultValue: resetValue,
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  const requestedOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const selectionMode = computed(() => mode)
  const locale = computed(() => toValue(options.locale) ?? 'en-US')
  const isDisabled = computed(() => Boolean(toValue(options.disabled)))
  const isReadonly = computed(() => Boolean(toValue(options.readonly)))
  const isRequired = computed(() => Boolean(toValue(options.required)))
  const isExternallyInvalid = computed(() => Boolean(toValue(options.invalid)))
  const minValue = computed(() => toValue(options.minValue))
  const maxValue = computed(() => toValue(options.maxValue))
  const formatHint = computed(() => toValue(options.formatHint) ?? 'YYYY-MM-DD')

  const isOpen = computed(
    () => requestedOpen.value && !isDisabled.value && !isReadonly.value,
  )

  const hasConfigurationError = computed(() => {
    const min = minValue.value
    const max = maxValue.value
    return min !== undefined && max !== undefined && min.compare(max) > 0
  })

  const drafts = shallowRef<Drafts>({})
  const draftErrors = shallowRef<GhostDatePickerError[]>([])
  const anchor = shallowRef<CalendarDate | null>(null)
  const calendarError = shallowRef<GhostDatePickerError | null>(null)
  const validationAttempted = shallowRef(false)

  // ---------------------------------------------------------------------------
  // Messages

  function defaultMessage(
    code: GhostDatePickerErrorCode,
    detail?: string,
  ): string {
    switch (code) {
      case 'parse':
        return `Enter a valid date (${formatHint.value})`
      case 'incomplete':
        return 'Enter both a start date and an end date'
      case 'min':
        return `Choose a date on or after ${detail ?? ''}`.trim()
      case 'max':
        return `Choose a date on or before ${detail ?? ''}`.trim()
      case 'unavailable':
        return 'This date is unavailable'
      case 'range-order':
        return 'The end date must be on or after the start date'
      case 'range-validation':
        return detail ?? 'This range is not allowed'
      case 'required':
        return mode === 'range' ? 'Enter a date range' : 'Enter a date'
      case 'external-invalid':
        return 'Enter a valid date'
      case 'configuration':
        return 'This date picker is misconfigured'
      case 'uncommitted':
        return 'Confirm this date'
    }
  }

  function makeError(
    code: GhostDatePickerErrorCode,
    part: GhostDatePickerError['part'],
    detail?: string,
  ): GhostDatePickerError {
    const error: GhostDatePickerError = {
      code,
      part,
      message: defaultMessage(code, detail),
    }
    const localize = toValue(options.validationMessage)
    return localize ? { ...error, message: localize(error) } : error
  }

  // ---------------------------------------------------------------------------
  // Text

  function textContext(part: GhostDatePickerPart) {
    return { locale: locale.value, part }
  }

  function formatDate(date: CalendarDate, part: GhostDatePickerPart): string {
    const format = toValue(options.format)
    if (!format) {
      return toIsoDate(date)
    }
    try {
      return format(date, textContext(part))
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        logGhostCode('GHOST004', { date: toIsoDate(date) })
      }
      return toIsoDate(date)
    }
  }

  function committedPart(part: GhostDatePickerPart): CalendarDate | null {
    const current = value.value
    if (part === 'single') {
      return mode === 'single' && isPickerDate(current) ? current : null
    }
    if (mode !== 'range' || !isPickerRange(current)) {
      return null
    }
    return part === 'start' ? current.start : current.end
  }

  function committedText(part: GhostDatePickerPart): string {
    const date = committedPart(part)
    return date ? formatDate(date, part) : ''
  }

  function displayText(part: GhostDatePickerPart): string {
    return drafts.value[part] ?? committedText(part)
  }

  function isDirty(part: GhostDatePickerPart): boolean {
    const draft = drafts.value[part]
    return draft !== undefined && draft !== committedText(part)
  }

  function setDraft(part: GhostDatePickerPart, text: string): void {
    if (isDisabled.value || isReadonly.value) {
      return
    }
    drafts.value = { ...drafts.value, [part]: text }
  }

  function clearDrafts(): void {
    drafts.value = {}
    draftErrors.value = []
  }

  // ---------------------------------------------------------------------------
  // Validation

  /** Bounds and availability for one endpoint (built-in rules only). */
  function endpointError(
    date: CalendarDate,
    part: GhostDatePickerPart,
  ): GhostDatePickerError | null {
    if (hasConfigurationError.value) {
      return makeError('configuration', part)
    }
    const min = minValue.value
    const max = maxValue.value
    if (min && date.compare(min) < 0) {
      return makeError('min', part, formatDate(min, part))
    }
    if (max && date.compare(max) > 0) {
      return makeError('max', part, formatDate(max, part))
    }
    if (toValue(options.isDateDisabled)?.(date)) {
      return makeError('unavailable', part)
    }
    return null
  }

  /** Pair-level rules. Never scans the dates inside the range. */
  function rangeError(
    range: GhostDatePickerRange,
  ): GhostDatePickerError | null {
    if (range.start.compare(range.end) > 0) {
      return makeError('range-order', 'range')
    }
    const message = toValue(options.validateRange)?.(range)
    return message ? makeError('range-validation', 'range', message) : null
  }

  function parseText(text: string, part: GhostDatePickerPart): ParsedText {
    const parse = toValue(options.parse)
    let parsed: CalendarDate | null
    try {
      parsed = parse ? parse(text, textContext(part)) : parseIsoDate(text)
    } catch {
      // A throwing consumer parser is an invalid draft, never a crash.
      parsed = null
    }
    // Custom parsers may return anything at runtime; only date-only Gregorian
    // values in years 0001-9999 are accepted.
    if (!isPickerDate(parsed)) {
      return { error: makeError('parse', part) }
    }
    const error = endpointError(parsed, part)
    return error ? { error } : { date: parsed }
  }

  /** Errors describing the committed value itself (external values). */
  const committedErrors = computed<GhostDatePickerError[]>(() => {
    const current = value.value
    if (hasConfigurationError.value) {
      return [
        makeError('configuration', mode === 'single' ? 'single' : 'range'),
      ]
    }
    if (!hasValidShape(current, mode)) {
      return [
        makeError('configuration', mode === 'single' ? 'single' : 'range'),
      ]
    }
    if (isPickerDate(current)) {
      const error = endpointError(current, 'single')
      return error ? [error] : []
    }
    if (isPickerRange(current)) {
      const result: GhostDatePickerError[] = []
      for (const part of RANGE_PARTS) {
        const error = endpointError(current[part], part)
        if (error) {
          result.push(error)
        }
      }
      const pair = rangeError(current)
      if (pair) {
        result.push(pair)
      }
      return result
    }
    return []
  })

  function partsOf(): readonly GhostDatePickerPart[] {
    return mode === 'single' ? ['single'] : RANGE_PARTS
  }

  /** Dirty drafts with no error from their last commit attempt. */
  function uncommittedErrors(): GhostDatePickerError[] {
    const result: GhostDatePickerError[] = []
    for (const part of partsOf()) {
      if (
        isDirty(part) &&
        !draftErrors.value.some(
          (error) => error.part === part || error.part === 'range',
        )
      ) {
        result.push(makeError('uncommitted', part))
      }
    }
    return result
  }

  const errors = computed<GhostDatePickerError[]>(() => {
    const result: GhostDatePickerError[] = [...draftErrors.value]
    // A committed-value error for a part that has its own draft error is
    // superseded by what the user is typing.
    for (const error of committedErrors.value) {
      if (!result.some((existing) => existing.part === error.part)) {
        result.push(error)
      }
    }
    if (calendarError.value) {
      result.push(calendarError.value)
    }
    if (validationAttempted.value) {
      result.push(...uncommittedErrors())
      const empty = partsOf().every((part) => displayText(part) === '')
      if (isRequired.value && value.value === null && empty) {
        result.push(
          makeError('required', mode === 'single' ? 'single' : 'range'),
        )
      }
    }
    if (isExternallyInvalid.value) {
      result.push(
        makeError('external-invalid', mode === 'single' ? 'single' : 'range'),
      )
    }
    return result
  })

  function errorsFor(part: GhostDatePickerPart): GhostDatePickerError[] {
    return errors.value.filter(
      (error) => error.part === part || error.part === 'range',
    )
  }

  /**
   * Native custom validity for one visible input. Kept in sync while typing so
   * a dirty draft blocks submission (including `form.requestSubmit()`) before
   * any visible error appears; the visible error waits for a commit attempt.
   * Calendar-only errors never block: they do not describe the form value.
   */
  function validityMessage(part: GhostDatePickerPart): string {
    if (isDisabled.value) {
      return ''
    }
    const own = (error: GhostDatePickerError) =>
      error.part === part || error.part === 'range'
    const draft = draftErrors.value.find(own)
    if (draft) {
      return draft.message
    }
    if (isDirty(part)) {
      return makeError('uncommitted', part).message
    }
    const committed = committedErrors.value.find(own)
    if (committed) {
      return committed.message
    }
    if (isExternallyInvalid.value) {
      return makeError(
        'external-invalid',
        mode === 'single' ? 'single' : 'range',
      ).message
    }
    return ''
  }

  // ---------------------------------------------------------------------------
  // Commits

  function setCommitted(next: GhostDatePickerValue): void {
    // Equal dates or ranges never emit a duplicate `update:modelValue`.
    if (
      valueKey(next) === valueKey(value.value) &&
      hasValidShape(value.value, mode)
    ) {
      return
    }
    value.value = next
  }

  function commitText(): boolean {
    if (isDisabled.value || isReadonly.value) {
      return false
    }
    const parts = partsOf()
    if (!parts.some((part) => isDirty(part))) {
      // Nothing edited: drop stale draft text equal to the committed value.
      clearDrafts()
      return true
    }

    if (mode === 'single') {
      const text = displayText('single')
      if (text === '') {
        setCommitted(null)
        clearDrafts()
        return true
      }
      const parsed = parseText(text, 'single')
      if (parsed.error) {
        draftErrors.value = [parsed.error]
        return false
      }
      setCommitted(parsed.date)
      clearDrafts()
      return true
    }

    const startText = displayText('start')
    const endText = displayText('end')
    if (startText === '' && endText === '') {
      setCommitted(null)
      clearDrafts()
      return true
    }
    const nextErrors: GhostDatePickerError[] = []
    const dates: Partial<Record<'start' | 'end', CalendarDate>> = {}
    for (const part of RANGE_PARTS) {
      const text = part === 'start' ? startText : endText
      if (text === '') {
        // Clearing only one endpoint keeps the committed pair.
        nextErrors.push(makeError('incomplete', part))
        continue
      }
      const parsed = parseText(text, part)
      if (parsed.error) {
        nextErrors.push(parsed.error)
      } else {
        dates[part] = parsed.date
      }
    }
    const { start, end } = dates
    if (nextErrors.length > 0 || !start || !end) {
      draftErrors.value = nextErrors
      return false
    }
    // Typed endpoints are never swapped: a reversed pair is an error.
    const pairError = rangeError({ start, end })
    if (pairError) {
      draftErrors.value = [pairError]
      return false
    }
    setCommitted({ start, end })
    clearDrafts()
    return true
  }

  function revertText(): void {
    clearDrafts()
  }

  function cancelCalendar(): void {
    anchor.value = null
    calendarError.value = null
  }

  function openCalendar(): void {
    if (isDisabled.value || isReadonly.value) {
      return
    }
    requestedOpen.value = true
  }

  function close(): void {
    cancelCalendar()
    requestedOpen.value = false
  }

  function selectCalendarDate(date: CalendarDate): void {
    if (isDisabled.value || isReadonly.value) {
      return
    }
    if (mode === 'single') {
      const error = endpointError(date, 'single')
      if (error) {
        calendarError.value = error
        return
      }
      setCommitted(date)
      clearDrafts()
      close()
      return
    }

    const first = anchor.value
    if (!first) {
      // First activation only starts local progress; the committed value and
      // the open state stay unchanged.
      anchor.value = date
      calendarError.value = null
      return
    }
    // Calendar activations are sorted (unlike typed endpoints): clicking an
    // earlier day second is an ordinary way to pick a range.
    const range: GhostDatePickerRange =
      first.compare(date) <= 0
        ? { start: first, end: date }
        : { start: date, end: first }
    const error =
      endpointError(range.start, 'start') ??
      endpointError(range.end, 'end') ??
      rangeError(range)
    if (error) {
      // Keep the anchor and the dialog so another end date can be chosen.
      calendarError.value = error
      return
    }
    setCommitted(range)
    clearDrafts()
    close()
  }

  function clear(): void {
    if (isDisabled.value || isReadonly.value) {
      return
    }
    setCommitted(null)
    clearDrafts()
    cancelCalendar()
  }

  function markValidationAttempted(): void {
    validationAttempted.value = true
  }

  function applyFormReset(): void {
    // Controlled: restore the current props without emitting. Uncontrolled:
    // restore the captured initial default.
    if (toValue(options.modelValue) === undefined) {
      setCommitted(resetValue)
    }
    clearDrafts()
    cancelCalendar()
    validationAttempted.value = false
    if (requestedOpen.value) {
      requestedOpen.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Reactions

  // A material external value change replaces drafts and cancels range
  // progress. Our own commits already cleared them, so re-clearing is a no-op.
  watch(
    () => valueKey(value.value),
    () => {
      clearDrafts()
      cancelCalendar()
    },
  )

  // Entering disabled/readonly cancels progress and requests close; the
  // effective open state already hides the surface even if the parent ignores
  // the request. Re-enabling follows the (possibly retained) `open` prop.
  watch(
    () => isDisabled.value || isReadonly.value,
    (blocked) => {
      if (!blocked) {
        return
      }
      cancelCalendar()
      if (requestedOpen.value) {
        requestedOpen.value = false
      }
    },
  )

  // Constraints can change while a range is in progress (async availability).
  // Revalidate the anchor; the second activation checks everything again.
  watch(
    [
      minValue,
      maxValue,
      () => toValue(options.isDateDisabled),
      hasConfigurationError,
    ],
    () => {
      const first = anchor.value
      if (first && endpointError(first, 'start')) {
        cancelCalendar()
      }
    },
  )

  const pending = computed(
    () => anchor.value !== null || partsOf().some((part) => isDirty(part)),
  )

  const calendarValue = computed<CalendarDate | GhostDatePickerRange | null>(
    () => {
      const first = anchor.value
      if (first) {
        return { start: first, end: first }
      }
      const current = value.value
      return hasValidShape(current, mode) ? current : null
    },
  )

  const initialVisibleMonth = computed<CalendarDate | undefined>(() => {
    const committed = startOf(value.value)
    return (
      committed ??
      toValue(options.defaultVisibleMonth) ??
      toValue(options.today)
    )
  })

  /**
   * Selected date (or range start), else `today` when it is in the initial
   * month, else the first day of that month, clamped to min/max. `today` in
   * another month is skipped: a roving focus date must be in the visible grid.
   */
  const initialFocusDate = computed<CalendarDate | undefined>(() => {
    const committed = startOf(value.value)
    let target = committed
    if (!target) {
      const month = initialVisibleMonth.value
      const today = toValue(options.today)
      if (
        today &&
        (!month || (today.year === month.year && today.month === month.month))
      ) {
        target = today
      } else if (month) {
        target = month.set({ day: 1 })
      }
    }
    if (!target || hasConfigurationError.value) {
      return target
    }
    const min = minValue.value
    const max = maxValue.value
    if (min && target.compare(min) < 0) {
      return min
    }
    if (max && target.compare(max) > 0) {
      return max
    }
    return target
  })

  return {
    value,
    selectionMode,
    locale,
    requestedOpen,
    isOpen,
    isDisabled,
    isReadonly,
    isRequired,
    pending,
    errors,
    anchor,
    calendarError,
    calendarValue,
    initialVisibleMonth,
    initialFocusDate,
    hasConfigurationError,
    displayText,
    isDirty,
    errorsFor,
    validityMessage,
    setDraft,
    commitText,
    revertText,
    selectCalendarDate,
    markValidationAttempted,
    clear,
    openCalendar,
    close,
    cancelCalendar,
    applyFormReset,
  }
}
