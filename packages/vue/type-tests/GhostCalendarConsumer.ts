import { shallowRef } from 'vue'

import {
  CalendarDate,
  useGhostCalendar,
  type GhostCalendar,
  type GhostCalendarProps,
  type GhostCalendarRangeValue,
  type GhostCalendarSlotProps,
  type GhostCalendarValue,
  type UseGhostCalendarOptions,
} from '../src'

const day = new CalendarDate(2024, 6, 14)

// `null` is accepted only as controlled-empty input.
const controlledEmpty = { modelValue: null } satisfies GhostCalendarProps
const uncontrolled = { modelValue: undefined } satisfies GhostCalendarProps
const controlledDay = {
  modelValue: day,
  defaultValue: day,
} satisfies GhostCalendarProps
const componentProps: InstanceType<typeof GhostCalendar>['$props'] = {
  modelValue: null,
  selectionMode: 'range',
  onSelect: (date: CalendarDate) => {
    void date
  },
  'onUpdate:modelValue': (value: GhostCalendarValue) => {
    void value
  },
}

const model = shallowRef<GhostCalendarRangeValue | null>(null)
const options: UseGhostCalendarOptions = {
  modelValue: model,
  selectionMode: 'range',
  onSelect: (date) => {
    const selected: CalendarDate = date
    void selected
  },
  onValueChange: (value) => {
    const next: GhostCalendarValue = value
    // @ts-expect-error emitted proposals keep the existing type and never carry null
    const asNull: null = value
    void next
    void asNull
  },
}
const api = useGhostCalendar(options)
// Readers keep the existing output type: empty is `undefined`, never `null`.
const current: GhostCalendarValue = api.modelValue.value
// @ts-expect-error the returned model is not widened to null
api.modelValue.value = null

function useSlot(slot: GhostCalendarSlotProps) {
  const value: GhostCalendarValue = slot.modelValue
  // @ts-expect-error slot modelValue does not include null
  const asNull: null = slot.modelValue
  void value
  void asNull
}

// @ts-expect-error GhostCalendarValue itself stays null-free
const nullValue: GhostCalendarValue = null

// @ts-expect-error defaultValue does not accept null; only modelValue does
const nullDefault = { defaultValue: null } satisfies GhostCalendarProps

// @ts-expect-error modelValue is a CalendarDate or range, not an ISO string
const stringModel = { modelValue: '2024-06-14' } satisfies GhostCalendarProps

const rangeSelect: UseGhostCalendarOptions = {
  // @ts-expect-error select reports the activated CalendarDate, not a range
  onSelect: (range: GhostCalendarRangeValue) => {
    void range
  },
}

void controlledEmpty
void uncontrolled
void controlledDay
void componentProps
void current
void useSlot
void nullValue
void nullDefault
void stringModel
void rangeSelect
