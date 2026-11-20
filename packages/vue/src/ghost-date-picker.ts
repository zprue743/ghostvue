import type { CalendarDate } from '@internationalized/date'
import type {
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
  WritableComputedRef,
} from 'vue'

import type {
  GhostPopoverFlipOptions,
  GhostPopoverOffsetOptions,
  GhostPopoverPlacement,
  GhostPopoverShiftOptions,
  GhostPopoverStrategy,
} from './ghost-popover'
import type { GhostPortalTarget } from './ghost-portal'

/** Inclusive date range. Equal endpoints are a valid one-day range. */
export interface GhostDatePickerRange {
  start: CalendarDate
  end: CalendarDate
}

/** Committed picker value: a date (single mode), a range, or empty. */
export type GhostDatePickerValue = CalendarDate | GhostDatePickerRange | null

/** Which value a text input edits. */
export type GhostDatePickerPart = 'single' | 'start' | 'end'

/** Selection mode, fixed for the lifetime of a picker instance. */
export type GhostDatePickerSelectionMode = 'single' | 'range'

/** Day of week (Sunday = `0`). */
export type GhostDatePickerWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Context passed to `parse` and `format`. */
export interface GhostDatePickerTextContext {
  locale: string
  part: GhostDatePickerPart
}

/**
 * Synchronous text parser. Return `null` for invalid nonempty text; empty text
 * never reaches the parser. Must round-trip text produced by `format`.
 */
export type GhostDatePickerParse = (
  text: string,
  context: GhostDatePickerTextContext,
) => CalendarDate | null

/** Synchronous display formatter. Never affects ISO form serialization. */
export type GhostDatePickerFormat = (
  date: CalendarDate,
  context: GhostDatePickerTextContext,
) => string

/** Whole-range business validation. Return an error message or `null`. */
export type GhostDatePickerValidateRange = (
  range: GhostDatePickerRange,
) => string | null

/** Stable machine-readable error codes. */
export type GhostDatePickerErrorCode =
  | 'parse'
  | 'incomplete'
  | 'min'
  | 'max'
  | 'unavailable'
  | 'range-order'
  | 'range-validation'
  | 'required'
  | 'external-invalid'
  | 'configuration'
  | 'uncommitted'

/** One validation error with its default (or localized) message. */
export interface GhostDatePickerError {
  code: GhostDatePickerErrorCode
  part: GhostDatePickerPart | 'range'
  message: string
}

/** Props for the renderless {@link GhostDatePicker} root. */
export interface GhostDatePickerProps {
  /**
   * `'single'` or `'range'`. Fixed for an instance; remount with a new `key`
   * to change modes.
   * @default 'single'
   */
  selectionMode?: GhostDatePickerSelectionMode
  /**
   * Controlled committed value. `undefined` is uncontrolled; `null` is a
   * controlled empty value.
   * @default undefined
   */
  modelValue?: GhostDatePickerValue | undefined
  /**
   * Initial uncontrolled value and uncontrolled form-reset target.
   * @default null
   */
  defaultValue?: GhostDatePickerValue
  /**
   * Controlled requested open state.
   * @default undefined
   */
  open?: boolean | undefined
  /**
   * Initial uncontrolled open state.
   * @default false
   */
  defaultOpen?: boolean
  /** Inclusive lower bound. */
  minValue?: CalendarDate | undefined
  /** Inclusive upper bound. */
  maxValue?: CalendarDate | undefined
  /** Unavailable endpoint dates; they stay focusable in the calendar. */
  isDateDisabled?: ((date: CalendarDate) => boolean) | undefined
  /** Optional whole-range business validation. */
  validateRange?: GhostDatePickerValidateRange | undefined
  /**
   * Calendar and formatting locale.
   * @default 'en-US'
   */
  locale?: string
  /** Week start override (Sunday = `0`); defaults to the locale preference. */
  weekStartsOn?: GhostDatePickerWeekday | undefined
  /** Explicit current date for SSR-safe "today" styling and focus fallback. */
  today?: CalendarDate | undefined
  /** Month shown when the picker opens empty. */
  defaultVisibleMonth?: CalendarDate | undefined
  /** Synchronous parser. Defaults to strict ISO `YYYY-MM-DD`. */
  parse?: GhostDatePickerParse | undefined
  /** Synchronous formatter. Defaults to ISO `YYYY-MM-DD`. */
  format?: GhostDatePickerFormat | undefined
  /** @default false */
  disabled?: boolean
  /** @default false */
  readonly?: boolean
  /** @default false */
  required?: boolean
  /** Consumer-supplied invalid state (`external-invalid`). @default false */
  invalid?: boolean
  /** Form name (`name` single; `name[start]` / `name[end]` range). */
  name?: string | undefined
  /** Range start submission name override. */
  startName?: string | undefined
  /** Range end submission name override. */
  endName?: string | undefined
  /** External `<form>` id for submission, validation, and reset. */
  form?: string | undefined
  /**
   * Format description linked to every input.
   * @default 'YYYY-MM-DD'
   */
  formatHint?: string
  /** Localizes built-in error messages. */
  validationMessage?: ((error: GhostDatePickerError) => string) | undefined
}

/** Default slot props of {@link GhostDatePicker}. */
export interface GhostDatePickerSlotProps {
  /** Committed value. */
  value: GhostDatePickerValue
  /** Effective open state (`requested && !disabled && !readonly`). */
  open: boolean
  /** `true` while text is uncommitted or a calendar range is in progress. */
  pending: boolean
  /** Errors currently shown to the user. */
  errors: GhostDatePickerError[]
  /** Commits `null` when editable. */
  clear: () => void
  /** Requests open. */
  openCalendar: () => void
  /** Requests close. */
  close: () => void
}

/** Props for {@link GhostDatePickerInput}. */
export interface GhostDatePickerInputProps {
  /**
   * Which value this input edits. Range pickers need one `start` and one `end`.
   * @default 'single'
   */
  part?: GhostDatePickerPart
  /** Combines with the root (for example from `GhostFieldControl`). */
  disabled?: boolean
  /** Combines with the root (for example from `GhostFieldControl`). */
  invalid?: boolean
  /** Combines with the root (for example from `GhostFieldControl`). */
  required?: boolean
}

/** Props for {@link GhostDatePickerContent}. */
export interface GhostDatePickerContentProps {
  /** @default 'bottom-start' */
  placement?: GhostPopoverPlacement
  /** Distance or axis offsets passed to the floating layer. */
  offset?: GhostPopoverOffsetOptions | boolean | undefined
  /** @default true */
  flip?: boolean | GhostPopoverFlipOptions
  /** @default true */
  shift?: boolean | GhostPopoverShiftOptions
  /** @default 'absolute' */
  strategy?: GhostPopoverStrategy
  /** @default true */
  portal?: boolean
  /** @default 'body' */
  portalTo?: GhostPortalTarget
  /**
   * Accessible name of the built-in Close control.
   * @default 'Close date picker'
   */
  closeLabel?: string
}

/** Template ref contract shared by DatePicker DOM parts. */
export interface GhostDatePickerPartExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Template ref contract of {@link GhostDatePickerInput}. */
export interface GhostDatePickerInputExposed {
  readonly element: HTMLInputElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/**
 * Reactive source for a callback option. Unlike other options a callback
 * cannot be passed bare, because `toValue` would call it as a getter: pass a
 * ref or a getter that returns the callback (`() => props.parse`).
 */
export type GhostDatePickerCallbackSource<Fn> =
  Readonly<Ref<Fn | undefined>> | (() => Fn | undefined)

/** Options for {@link useGhostDatePicker}. Mirrors the root props. */
export interface UseGhostDatePickerOptions {
  selectionMode?: MaybeRefOrGetter<GhostDatePickerSelectionMode | undefined>
  modelValue?: MaybeRefOrGetter<GhostDatePickerValue | undefined>
  defaultValue?: MaybeRefOrGetter<GhostDatePickerValue | undefined>
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  minValue?: MaybeRefOrGetter<CalendarDate | undefined>
  maxValue?: MaybeRefOrGetter<CalendarDate | undefined>
  isDateDisabled?: GhostDatePickerCallbackSource<
    (date: CalendarDate) => boolean
  >
  validateRange?: GhostDatePickerCallbackSource<GhostDatePickerValidateRange>
  locale?: MaybeRefOrGetter<string | undefined>
  weekStartsOn?: MaybeRefOrGetter<GhostDatePickerWeekday | undefined>
  today?: MaybeRefOrGetter<CalendarDate | undefined>
  defaultVisibleMonth?: MaybeRefOrGetter<CalendarDate | undefined>
  parse?: GhostDatePickerCallbackSource<GhostDatePickerParse>
  format?: GhostDatePickerCallbackSource<GhostDatePickerFormat>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  readonly?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  formatHint?: MaybeRefOrGetter<string | undefined>
  validationMessage?: GhostDatePickerCallbackSource<
    (error: GhostDatePickerError) => string
  >
  /** Called with each committed value proposal (`update:modelValue`). */
  onValueChange?: (value: GhostDatePickerValue) => void
  /** Called with each open-state proposal (`update:open`). */
  onOpenChange?: (open: boolean) => void
}

/** State and actions returned by {@link useGhostDatePicker}. */
export interface UseGhostDatePickerReturn {
  /** Committed value (controlled prop or internal state). */
  value: WritableComputedRef<GhostDatePickerValue>
  selectionMode: ComputedRef<GhostDatePickerSelectionMode>
  locale: ComputedRef<string>
  /** Requested open state before `disabled` / `readonly` precedence. */
  requestedOpen: WritableComputedRef<boolean>
  /** Effective open state. */
  isOpen: ComputedRef<boolean>
  isDisabled: ComputedRef<boolean>
  isReadonly: ComputedRef<boolean>
  isRequired: ComputedRef<boolean>
  /** `true` while text is uncommitted or a calendar range is in progress. */
  pending: ComputedRef<boolean>
  /** Errors shown to the user (after a commit attempt or invalid event). */
  errors: ComputedRef<GhostDatePickerError[]>
  /** Pending calendar range anchor. */
  anchor: Ref<CalendarDate | null>
  /** Value the calendar displays (committed value, or the pending anchor). */
  calendarValue: ComputedRef<CalendarDate | GhostDatePickerRange | null>
  /** Month shown when the calendar opens. */
  initialVisibleMonth: ComputedRef<CalendarDate | undefined>
  /** Date the calendar focuses when it opens. */
  initialFocusDate: ComputedRef<CalendarDate | undefined>
  /** `minValue > maxValue`: date selection is disabled. */
  hasConfigurationError: ComputedRef<boolean>
  /** Rejected second range activation (or unavailable date) in the calendar. */
  calendarError: Ref<GhostDatePickerError | null>
  /** Text currently shown in `part`'s input. */
  displayText: (part: GhostDatePickerPart) => string
  /** `true` when `part`'s text differs from the committed value. */
  isDirty: (part: GhostDatePickerPart) => boolean
  /** Visible errors that belong to `part` (including pair-level errors). */
  errorsFor: (part: GhostDatePickerPart) => GhostDatePickerError[]
  /** Native custom-validity message for `part` (`''` when valid). */
  validityMessage: (part: GhostDatePickerPart) => string
  /** Stores raw text for `part` without committing or reformatting. */
  setDraft: (part: GhostDatePickerPart, text: string) => void
  /** Attempts to commit the current text. Returns `true` on success. */
  commitText: () => boolean
  /** Restores text from the committed value and clears draft errors. */
  revertText: () => void
  /** Handles an accepted calendar activation. */
  selectCalendarDate: (date: CalendarDate) => void
  /** Marks native validation as attempted so `required` errors show. */
  markValidationAttempted: () => void
  /** Commits `null` when editable. */
  clear: () => void
  openCalendar: () => void
  close: () => void
  /** Discards calendar-only progress (anchor and calendar error). */
  cancelCalendar: () => void
  /** Native form reset reconciliation. */
  applyFormReset: () => void
}

/** Internal context shared by DatePicker parts. */
export interface GhostDatePickerContext extends UseGhostDatePickerReturn {
  contentId: ComputedRef<string>
  hintId: ComputedRef<string>
  errorId: (part: GhostDatePickerPart) => string
  summaryId: ComputedRef<string>
  form: ComputedRef<string | undefined>
  minValue: ComputedRef<CalendarDate | undefined>
  maxValue: ComputedRef<CalendarDate | undefined>
  isDateDisabled: ComputedRef<((date: CalendarDate) => boolean) | undefined>
  weekStartsOn: ComputedRef<GhostDatePickerWeekday | undefined>
  today: ComputedRef<CalendarDate | undefined>
  formatHint: ComputedRef<string>
  /** Errors to show in the open dialog's error summary (empty when hidden). */
  summaryErrors: ComputedRef<GhostDatePickerError[]>
  /** Increments after each applied form reset so inputs resync their DOM. */
  resetVersion: Ref<number>
  registerInput: (
    part: GhostDatePickerPart,
    element: HTMLInputElement | null,
  ) => void
  inputElement: (part: GhostDatePickerPart) => HTMLInputElement | null
  setTriggerElement: (element: HTMLElement | null) => void
  triggerElement: Ref<HTMLElement | null>
  setSummaryElement: (element: HTMLElement | null) => void
  /** Called by an input's native `invalid` event. */
  onInputInvalid: (event: Event) => void
  /** Registered by `GhostDatePickerCalendar` while mounted. */
  calendarFocus: Ref<{
    ready: ComputedRef<boolean>
    resolve: () => HTMLElement | null
  } | null>
}

export const ghostDatePickerContextKey: InjectionKey<GhostDatePickerContext> =
  Symbol('ghost-date-picker')
