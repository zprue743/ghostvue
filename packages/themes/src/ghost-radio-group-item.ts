import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostRadioGroupItem as GhostUnstyledRadioGroupItem,
  type GhostRadioGroupItemExposed,
} from '@ghostvue/vue'

import type { GhostRadioGroupSize } from './ghost-radio-group'

/** Themed {@link GhostRadioGroupItem} wrapper. */
export const GhostRadioGroupItem = defineComponent({
  name: 'GhostRadioGroupItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    size: { type: String as PropType<GhostRadioGroupSize>, default: 'md' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostRadioGroupItemExposed | null>(null)

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
    } satisfies GhostRadioGroupItemExposed)

    return () =>
      h(
        GhostUnstyledRadioGroupItem,
        {
          ...attrs,
          ref: inner,
          value: props.value,
          disabled: props.disabled,
          'data-size': props.size === 'md' ? undefined : props.size,
        },
        slots,
      )
  },
})

export type { GhostRadioGroupItemExposed }
