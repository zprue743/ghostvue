import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDatePickerContent as GhostUnstyledDatePickerContent,
  type GhostDatePickerPartExposed,
  type GhostPopoverFlipOptions,
  type GhostPopoverOffsetOptions,
  type GhostPopoverPlacement,
  type GhostPopoverShiftOptions,
  type GhostPopoverStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

import { GhostDatePickerCalendar } from './ghost-date-picker-calendar'

/**
 * Themed {@link GhostDatePickerContent}. Sets `data-themed` for the elevated
 * surface and wraps the slot in a `display: contents` `.ghost-themed-scope`
 * so the portaled calendar parts pick up the calendar recipe.
 */
export const GhostDatePickerContent = defineComponent({
  name: 'GhostDatePickerContent',
  inheritAttrs: false,
  props: {
    placement: {
      type: String as PropType<GhostPopoverPlacement>,
      default: 'bottom-start',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostPopoverOffsetOptions | boolean | undefined
      >,
      default: 4,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostPopoverFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostPopoverShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostPopoverStrategy>,
      default: 'absolute',
    },
    portal: { type: Boolean, default: true },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
    closeLabel: { type: String, default: 'Close date picker' },
    endDateInstruction: { type: String, default: 'Choose an end date' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDatePickerPartExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostDatePickerPartExposed)

    return () =>
      h(
        GhostUnstyledDatePickerContent,
        { ...attrs, ...props, ref: inner, 'data-themed': '' },
        {
          default: () =>
            h(
              'div',
              { class: 'ghost-themed-scope' },
              slots['default']?.() ?? [h(GhostDatePickerCalendar)],
            ),
        },
      )
  },
})

export type { GhostDatePickerPartExposed }
