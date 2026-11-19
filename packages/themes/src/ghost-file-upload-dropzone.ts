import { defineComponent, h, ref } from 'vue'

import {
  GhostFileUploadDropzone as GhostUnstyledFileUploadDropzone,
  type GhostFileUploadDropzoneExposed,
  type GhostFileUploadDropzoneSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostFileUploadDropzone} wrapper. Drag, drop, and click
 * handling stay on the unstyled part; the wrapper only adds `data-themed`.
 */
export const GhostFileUploadDropzone = defineComponent({
  name: 'GhostFileUploadDropzone',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<GhostFileUploadDropzoneExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostFileUploadDropzoneExposed)

    return () =>
      h(
        GhostUnstyledFileUploadDropzone,
        {
          ...attrs,
          ref: inner,
          'data-themed': '',
        },
        slots as {
          default?: (slotProps: GhostFileUploadDropzoneSlotProps) => unknown
        },
      )
  },
})

export type { GhostFileUploadDropzoneExposed, GhostFileUploadDropzoneSlotProps }
