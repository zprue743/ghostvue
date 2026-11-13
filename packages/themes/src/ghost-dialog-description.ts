import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogDescription as GhostUnstyledDialogDescription,
  type GhostDialogDescriptionElement,
  type GhostDialogDescriptionExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDialogDescription} wrapper. */
export const GhostDialogDescription = defineComponent({
  name: 'GhostDialogDescription',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostDialogDescriptionElement>,
      default: 'p',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDialogDescriptionExposed | null>(null)

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
    } satisfies GhostDialogDescriptionExposed)

    return () =>
      h(
        GhostUnstyledDialogDescription,
        {
          ...attrs,
          ref: inner,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDialogDescriptionElement, GhostDialogDescriptionExposed }
