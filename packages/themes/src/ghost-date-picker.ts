import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDatePicker as GhostUnstyledDatePicker,
  type CalendarDate,
  type GhostDatePickerError,
  type GhostDatePickerFormat,
  type GhostDatePickerParse,
  type GhostDatePickerRange,
  type GhostDatePickerSelectionMode,
  type GhostDatePickerSlotProps,
  type GhostDatePickerValidateRange,
  type GhostDatePickerValue,
  type GhostDatePickerWeekday,
} from '@ghostvue/vue'

const optional = <T>(type: unknown) => ({
  type: type as PropType<T | undefined>,
  default: undefined,
})

/**
 * Themed {@link GhostDatePicker} root. Wraps the renderless headless root in a
 * `display: contents` `.ghost-themed-scope` so inputs and the trigger pick up
 * the recipe; behavior and form ownership stay on the unstyled primitive.
 */
export const GhostDatePicker = defineComponent({
  name: 'GhostDatePicker',
  inheritAttrs: false,
  props: {
    selectionMode: {
      type: String as PropType<GhostDatePickerSelectionMode>,
      default: 'single',
    },
    // `null` is forwarded as a controlled empty value; only `undefined`
    // leaves the headless root uncontrolled.
    modelValue: optional<GhostDatePickerValue>(Object),
    defaultValue: {
      type: Object as PropType<GhostDatePickerValue>,
      default: null,
    },
    open: optional<boolean>(Boolean),
    defaultOpen: { type: Boolean, default: false },
    minValue: optional<CalendarDate>(Object),
    maxValue: optional<CalendarDate>(Object),
    isDateDisabled: optional<(date: CalendarDate) => boolean>(Function),
    validateRange: optional<GhostDatePickerValidateRange>(Function),
    locale: { type: String, default: 'en-US' },
    weekStartsOn: optional<GhostDatePickerWeekday>(Number),
    today: optional<CalendarDate>(Object),
    defaultVisibleMonth: optional<CalendarDate>(Object),
    parse: optional<GhostDatePickerParse>(Function),
    format: optional<GhostDatePickerFormat>(Function),
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    name: optional<string>(String),
    startName: optional<string>(String),
    endName: optional<string>(String),
    form: optional<string>(String),
    formatHint: { type: String, default: 'YYYY-MM-DD' },
    validationMessage:
      optional<(error: GhostDatePickerError) => string>(Function),
  },
  emits: {
    'update:modelValue': (value: GhostDatePickerValue) =>
      value === null || typeof value === 'object',
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledDatePicker,
          {
            ...attrs,
            ...props,
            'onUpdate:modelValue': (next: GhostDatePickerValue) => {
              emit('update:modelValue', next)
            },
            'onUpdate:open': (next: boolean) => {
              emit('update:open', next)
            },
          },
          slots as {
            default?: (slotProps: GhostDatePickerSlotProps) => unknown
          },
        ),
      ])
  },
})

export type {
  GhostDatePickerError,
  GhostDatePickerRange,
  GhostDatePickerSlotProps,
  GhostDatePickerValue,
}
