import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerDescription as GhostUnstyledDrawerDescription,
  type GhostDrawerDescriptionElement,
  type GhostDrawerDescriptionExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDrawerDescription} wrapper. */
export const GhostDrawerDescription = defineComponent({
  name: 'GhostDrawerDescription',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostDrawerDescriptionElement>,
      default: 'p',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDrawerDescriptionExposed | null>(null)

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
    } satisfies GhostDrawerDescriptionExposed)

    return () =>
      h(
        GhostUnstyledDrawerDescription,
        {
          ...attrs,
          ref: inner,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDrawerDescriptionElement, GhostDrawerDescriptionExposed }
