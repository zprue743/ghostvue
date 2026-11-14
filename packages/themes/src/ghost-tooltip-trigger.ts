import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTooltipTrigger as GhostUnstyledTooltipTrigger,
  type GhostTooltipTriggerElement,
  type GhostTooltipTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostTooltipTrigger} wrapper. */
export const GhostTooltipTrigger = defineComponent({
  name: 'GhostTooltipTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTooltipTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTooltipTriggerExposed | null>(null)

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
    } satisfies GhostTooltipTriggerExposed)

    return () =>
      h(
        GhostUnstyledTooltipTrigger,
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

export type { GhostTooltipTriggerElement, GhostTooltipTriggerExposed }
