import { defineComponent, h, ref } from 'vue'

import {
  GhostCalendarGrid as GhostUnstyledCalendarGrid,
  type GhostCalendarPartExposed,
} from '@ghostvue/vue'

export const GhostCalendarGrid = defineComponent({
  name: 'GhostCalendarGrid',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<GhostCalendarPartExposed | null>(null)

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
    } satisfies GhostCalendarPartExposed)

    return () =>
      h(
        GhostUnstyledCalendarGrid,
        { ...attrs, ref: inner, 'data-themed': '' },
        slots,
      )
  },
})

export type { GhostCalendarPartExposed as GhostCalendarGridExposed }
