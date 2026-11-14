import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTabsList as GhostUnstyledTabsList,
  type GhostTabsListElement,
  type GhostTabsListExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostTabsList} wrapper. */
export const GhostTabsList = defineComponent({
  name: 'GhostTabsList',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTabsListElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTabsListExposed | null>(null)

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
    } satisfies GhostTabsListExposed)

    return () =>
      h(
        GhostUnstyledTabsList,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostTabsListElement, GhostTabsListExposed }
