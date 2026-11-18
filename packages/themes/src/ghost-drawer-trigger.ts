import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerTrigger as GhostUnstyledDrawerTrigger,
  type GhostDrawerTriggerElement,
  type GhostDrawerTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDrawerTrigger} wrapper. */
export const GhostDrawerTrigger = defineComponent({
  name: 'GhostDrawerTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDrawerTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDrawerTriggerExposed | null>(null)

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
    } satisfies GhostDrawerTriggerExposed)

    return () =>
      h(
        GhostUnstyledDrawerTrigger,
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

export type { GhostDrawerTriggerElement, GhostDrawerTriggerExposed }
