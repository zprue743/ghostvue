import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSelectTrigger as GhostUnstyledSelectTrigger,
  type GhostSelectTriggerElement,
  type GhostSelectTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostSelectTrigger} wrapper. */
export const GhostSelectTrigger = defineComponent({
  name: 'GhostSelectTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostSelectTriggerElement>,
      default: 'button',
    },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostSelectTriggerExposed | null>(null)

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
    } satisfies GhostSelectTriggerExposed)

    return () =>
      h(
        GhostUnstyledSelectTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
          class: ['ghost-select-trigger', attrs.class],
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostSelectTriggerElement, GhostSelectTriggerExposed }
