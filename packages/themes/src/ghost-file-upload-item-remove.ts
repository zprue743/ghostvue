import { defineComponent, h, ref } from 'vue'

import {
  GhostFileUploadItemRemove as GhostUnstyledFileUploadItemRemove,
  type GhostFileUploadItemRemoveExposed,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostFileUploadItemRemove} wrapper. Wrapped (not styled from
 * the item) so the focus ring and 44px target apply wherever the consumer
 * places the button inside an item.
 */
export const GhostFileUploadItemRemove = defineComponent({
  name: 'GhostFileUploadItemRemove',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<GhostFileUploadItemRemoveExposed | null>(null)

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
    } satisfies GhostFileUploadItemRemoveExposed)

    return () =>
      h(
        GhostUnstyledFileUploadItemRemove,
        {
          ...attrs,
          ref: inner,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostFileUploadItemRemoveExposed }
