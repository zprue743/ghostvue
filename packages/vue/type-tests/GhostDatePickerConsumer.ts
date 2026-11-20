import { CalendarDateTime } from '@internationalized/date'
import { shallowRef } from 'vue'

import {
  CalendarDate,
  useGhostDatePicker,
  type GhostDatePicker,
  type GhostDatePickerError,
  type GhostDatePickerProps,
  type GhostDatePickerRange,
  type GhostDatePickerTextContext,
  type GhostDatePickerValue,
  type UseGhostDatePickerOptions,
} from '../src'

const day = new CalendarDate(2026, 11, 17)

const single = { modelValue: day } satisfies GhostDatePickerProps
const range = {
  selectionMode: 'range',
  modelValue: { start: day, end: day },
} satisfies GhostDatePickerProps
const controlledEmpty = { modelValue: null } satisfies GhostDatePickerProps

const componentProps: InstanceType<typeof GhostDatePicker>['$props'] = {
  modelValue: null,
  parse: (text: string) => (text === 'today' ? day : null),
  format: (date: CalendarDate, context: GhostDatePickerTextContext) =>
    `${context.part}:${date.toString()}`,
  validateRange: (value: GhostDatePickerRange) =>
    value.end.compare(value.start) > 7 ? 'Too long' : null,
  validationMessage: (error: GhostDatePickerError) => error.message,
  'onUpdate:modelValue': (value: GhostDatePickerValue) => {
    void value
  },
}

// @ts-expect-error plain ISO strings are not values; parse them first
const stringModel = { modelValue: '2026-11-17' } satisfies GhostDatePickerProps

// @ts-expect-error JavaScript Date objects are rejected
const dateModel = { modelValue: new Date() } satisfies GhostDatePickerProps

const dateTimeModel = {
  // @ts-expect-error date-time values are not date-only CalendarDate values
  modelValue: new CalendarDateTime(2026, 11, 17, 9),
} satisfies GhostDatePickerProps

// @ts-expect-error a range needs both endpoints
const malformedRange: GhostDatePickerRange = { start: day }

const asyncParse = {
  // @ts-expect-error parsing is synchronous; promises are not supported
  parse: () => Promise.resolve(day),
} satisfies GhostDatePickerProps

const asyncValidate = {
  // @ts-expect-error range validation is synchronous
  validateRange: () => Promise.resolve(null),
} satisfies GhostDatePickerProps

const model = shallowRef<GhostDatePickerValue | undefined>(null)
const options: UseGhostDatePickerOptions = {
  modelValue: model,
  selectionMode: 'range',
  parse: () => (text) => (text ? day : null),
  onValueChange: (value) => {
    const next: GhostDatePickerValue = value
    void next
  },
}
const bareCallback: UseGhostDatePickerOptions = {
  // @ts-expect-error callback options take a getter or ref, never the bare callback
  isDateDisabled: (date: CalendarDate) => date.day === 1,
}
const api = useGhostDatePicker(options)
const committed: GhostDatePickerValue = api.value.value

void single
void range
void controlledEmpty
void componentProps
void stringModel
void dateModel
void dateTimeModel
void malformedRange
void asyncParse
void asyncValidate
void bareCallback
void committed
