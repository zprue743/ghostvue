import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerTitle as GhostUnstyledDrawerTitle,
  type GhostDrawerTitleElement,
  type GhostDrawerTitleExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDrawerTitle} wrapper. */
export const GhostDrawerTitle = defineComponent({
  name: 'GhostDrawerTitle',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDrawerTitleElement>,
      default: 'h2',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDrawerTitleExposed | null>(null)

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
    } satisfies GhostDrawerTitleExposed)

    return () =>
      h(
        GhostUnstyledDrawerTitle,
        {
          ...attrs,
          ref: inner,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDrawerTitleElement, GhostDrawerTitleExposed }
