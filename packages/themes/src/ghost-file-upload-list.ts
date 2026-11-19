import { defineComponent, h, ref } from 'vue'

import {
  GhostFileUploadList as GhostUnstyledFileUploadList,
  type GhostFileUploadListExposed,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostFileUploadList} wrapper. Items stay the headless
 * `GhostFileUploadItem`: they are always direct `li` children of this `ul`, so
 * the list styles them with a child combinator.
 */
export const GhostFileUploadList = defineComponent({
  name: 'GhostFileUploadList',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<GhostFileUploadListExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostFileUploadListExposed)

    return () =>
      h(
        GhostUnstyledFileUploadList,
        {
          ...attrs,
          ref: inner,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostFileUploadListExposed }
