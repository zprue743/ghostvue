import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogClose as GhostUnstyledDialogClose,
  type GhostDialogCloseElement,
  type GhostDialogCloseExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDialogClose} wrapper. */
export const GhostDialogClose = defineComponent({
  name: 'GhostDialogClose',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDialogCloseElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDialogCloseExposed | null>(null)

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
    } satisfies GhostDialogCloseExposed)

    return () =>
      h(
        GhostUnstyledDialogClose,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
        },
        slots,
      )
  },
})

export type { GhostDialogCloseElement, GhostDialogCloseExposed }
