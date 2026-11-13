import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostPopoverTrigger as GhostUnstyledPopoverTrigger,
  type GhostPopoverTriggerElement,
  type GhostPopoverTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostPopoverTrigger} wrapper. */
export const GhostPopoverTrigger = defineComponent({
  name: 'GhostPopoverTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostPopoverTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostPopoverTriggerExposed | null>(null)

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
    } satisfies GhostPopoverTriggerExposed)

    return () =>
      h(
        GhostUnstyledPopoverTrigger,
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

export type { GhostPopoverTriggerElement, GhostPopoverTriggerExposed }
