import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSegmentedControlItem as GhostUnstyledSegmentedControlItem,
  type GhostSegmentedControlItemElement,
  type GhostSegmentedControlItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostSegmentedControlItem} wrapper. */
export const GhostSegmentedControlItem = defineComponent({
  name: 'GhostSegmentedControlItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostSegmentedControlItemElement>,
      default: 'button',
    },
    value: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostSegmentedControlItemExposed | null>(null)

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
    } satisfies GhostSegmentedControlItemExposed)

    return () =>
      h(
        GhostUnstyledSegmentedControlItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostSegmentedControlItemElement,
  GhostSegmentedControlItemExposed,
}
