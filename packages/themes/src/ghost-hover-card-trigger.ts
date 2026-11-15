import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostHoverCardTrigger as GhostUnstyledHoverCardTrigger,
  type GhostHoverCardTriggerElement,
  type GhostHoverCardTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostHoverCardTrigger} wrapper. */
export const GhostHoverCardTrigger = defineComponent({
  name: 'GhostHoverCardTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostHoverCardTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostHoverCardTriggerExposed | null>(null)

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
    } satisfies GhostHoverCardTriggerExposed)

    return () =>
      h(
        GhostUnstyledHoverCardTrigger,
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

export type { GhostHoverCardTriggerElement, GhostHoverCardTriggerExposed }
