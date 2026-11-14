import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTabsTrigger as GhostUnstyledTabsTrigger,
  type GhostTabsTriggerElement,
  type GhostTabsTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostTabsTrigger} wrapper. */
export const GhostTabsTrigger = defineComponent({
  name: 'GhostTabsTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTabsTriggerElement>,
      default: 'button',
    },
    value: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTabsTriggerExposed | null>(null)

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
    } satisfies GhostTabsTriggerExposed)

    return () =>
      h(
        GhostUnstyledTabsTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostTabsTriggerElement, GhostTabsTriggerExposed }
