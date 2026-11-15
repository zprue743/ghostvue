import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostMenubarTrigger as GhostUnstyledMenubarTrigger,
  type GhostMenubarTriggerElement,
  type GhostMenubarTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarTrigger} wrapper. */
export const GhostMenubarTrigger = defineComponent({
  name: 'GhostMenubarTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostMenubarTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostMenubarTriggerExposed | null>(null)

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
    } satisfies GhostMenubarTriggerExposed)

    return () =>
      h(
        GhostUnstyledMenubarTrigger,
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

export type { GhostMenubarTriggerElement, GhostMenubarTriggerExposed }
