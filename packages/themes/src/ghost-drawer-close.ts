import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerClose as GhostUnstyledDrawerClose,
  type GhostDrawerCloseElement,
  type GhostDrawerCloseExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDrawerClose} wrapper. */
export const GhostDrawerClose = defineComponent({
  name: 'GhostDrawerClose',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDrawerCloseElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDrawerCloseExposed | null>(null)

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
    } satisfies GhostDrawerCloseExposed)

    return () =>
      h(
        GhostUnstyledDrawerClose,
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

export type { GhostDrawerCloseElement, GhostDrawerCloseExposed }
