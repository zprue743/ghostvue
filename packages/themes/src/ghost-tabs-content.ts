import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTabsContent as GhostUnstyledTabsContent,
  type GhostTabsContentElement,
  type GhostTabsContentExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostTabsContent} wrapper. */
export const GhostTabsContent = defineComponent({
  name: 'GhostTabsContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTabsContentElement>,
      default: 'div',
    },
    value: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTabsContentExposed | null>(null)

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
    } satisfies GhostTabsContentExposed)

    return () =>
      h(
        GhostUnstyledTabsContent,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostTabsContentElement, GhostTabsContentExposed }
