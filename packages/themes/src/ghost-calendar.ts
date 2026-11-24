import { defineComponent, h, type PropType } from 'vue'

import {
  GhostCalendar as GhostUnstyledCalendar,
  type CalendarDate,
  type GhostCalendarSelectionMode,
  type GhostCalendarSlotProps,
  type GhostCalendarValue,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostCalendar} root wrapper. The headless root renders no
 * element, so this wrapper adds a block `.ghost-themed-scope` container that
 * activates the calendar recipe for every part, including the weekday header,
 * week rows, and cells the grid renders itself. Consumer `class` and `style`
 * land on that container; other attributes and props reach the headless root.
 */
export const GhostCalendar = defineComponent({
  name: 'GhostCalendar',
  inheritAttrs: false,
  props: {
    // `null` is forwarded as a controlled empty selection; only `undefined`
    // leaves the headless root uncontrolled.
    modelValue: {
      type: Object as PropType<GhostCalendarValue | null | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: Object as PropType<GhostCalendarValue | undefined>,
      default: undefined,
    },
    selectionMode: {
      type: String as PropType<GhostCalendarSelectionMode>,
      default: 'single',
    },
    minValue: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
    maxValue: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
    locale: { type: String, default: 'en-US' },
    weekStartsOn: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    visibleMonth: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
    defaultVisibleMonth: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
    today: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'update:visibleMonth', 'select'],
  setup(props, { attrs, emit, slots }) {
    return () => {
      const { class: scopeClass, style: scopeStyle, ...rootAttrs } = attrs
      const calendarProps: Record<string, unknown> = {
        ...rootAttrs,
        selectionMode: props.selectionMode,
        locale: props.locale,
        disabled: props.disabled,
        'onUpdate:modelValue': (value: GhostCalendarValue) => {
          emit('update:modelValue', value)
        },
        'onUpdate:visibleMonth': (month: CalendarDate) => {
          emit('update:visibleMonth', month)
        },
        onSelect: (date: CalendarDate) => {
          emit('select', date)
        },
      }
      if (props.modelValue !== undefined) {
        calendarProps['modelValue'] = props.modelValue
      }
      if (props.defaultValue !== undefined) {
        calendarProps['defaultValue'] = props.defaultValue
      }
      if (props.minValue !== undefined) {
        calendarProps['minValue'] = props.minValue
      }
      if (props.maxValue !== undefined) {
        calendarProps['maxValue'] = props.maxValue
      }
      if (props.weekStartsOn !== undefined) {
        calendarProps['weekStartsOn'] = props.weekStartsOn
      }
      if (props.visibleMonth !== undefined) {
        calendarProps['visibleMonth'] = props.visibleMonth
      }
      if (props.defaultVisibleMonth !== undefined) {
        calendarProps['defaultVisibleMonth'] = props.defaultVisibleMonth
      }
      if (props.today !== undefined) {
        calendarProps['today'] = props.today
      }
      return h(
        'div',
        { class: ['ghost-themed-scope', scopeClass], style: scopeStyle },
        [h(GhostUnstyledCalendar, calendarProps, slots)],
      )
    }
  },
})

export type { GhostCalendarSlotProps }
