import { defineComponent, h, ref } from 'vue'

import {
  GhostDatePickerTrigger as GhostUnstyledDatePickerTrigger,
  type GhostDatePickerPartExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDatePickerTrigger}: icon button recipe via `data-themed`. */
export const GhostDatePickerTrigger = defineComponent({
  name: 'GhostDatePickerTrigger',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
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
        GhostUnstyledDatePickerTrigger,
        { ...attrs, ref: inner, 'data-themed': '' },
        slots,
      )
  },
})

export type { GhostDatePickerPartExposed }
