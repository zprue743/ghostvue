import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCollapsibleTrigger as GhostUnstyledCollapsibleTrigger,
  type GhostCollapsibleTriggerElement,
  type GhostCollapsibleTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostCollapsibleTrigger} wrapper. */
export const GhostCollapsibleTrigger = defineComponent({
  name: 'GhostCollapsibleTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostCollapsibleTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostCollapsibleTriggerExposed | null>(null)

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
    } satisfies GhostCollapsibleTriggerExposed)

    return () =>
      h(
        GhostUnstyledCollapsibleTrigger,
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

export type { GhostCollapsibleTriggerElement, GhostCollapsibleTriggerExposed }
