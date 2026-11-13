import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostPopoverClose as GhostUnstyledPopoverClose,
  type GhostPopoverCloseElement,
  type GhostPopoverCloseExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostPopoverClose} wrapper. */
export const GhostPopoverClose = defineComponent({
  name: 'GhostPopoverClose',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostPopoverCloseElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostPopoverCloseExposed | null>(null)

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
    } satisfies GhostPopoverCloseExposed)

    return () =>
      h(
        GhostUnstyledPopoverClose,
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

export type { GhostPopoverCloseElement, GhostPopoverCloseExposed }
