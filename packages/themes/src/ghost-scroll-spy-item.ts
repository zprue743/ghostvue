import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostScrollSpyItem as GhostUnstyledScrollSpyItem,
  type GhostScrollSpyItemElement,
  type GhostScrollSpyItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostScrollSpyItem} wrapper. */
export const GhostScrollSpyItem = defineComponent({
  name: 'GhostScrollSpyItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostScrollSpyItemElement>,
      default: 'li',
    },
    target: { type: String, default: undefined },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostScrollSpyItemExposed | null>(null)
    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostScrollSpyItemExposed)
    return () =>
      h(
        GhostUnstyledScrollSpyItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          ...(props.target !== undefined ? { target: props.target } : {}),
          'data-themed': '',
        },
        slots,
      )
  },
})
