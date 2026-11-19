import { defineComponent, h, ref } from 'vue'

import {
  GhostFileUploadTrigger as GhostUnstyledFileUploadTrigger,
  type GhostFileUploadTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostFileUploadTrigger} wrapper. */
export const GhostFileUploadTrigger = defineComponent({
  name: 'GhostFileUploadTrigger',
  inheritAttrs: false,
  props: {
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostFileUploadTriggerExposed | null>(null)

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
    } satisfies GhostFileUploadTriggerExposed)

    return () =>
      h(
        GhostUnstyledFileUploadTrigger,
        {
          ...attrs,
          ref: inner,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostFileUploadTriggerExposed }
