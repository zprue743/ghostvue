import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostScrollSpyList as GhostUnstyledScrollSpyList,
  type GhostScrollSpyListElement,
  type GhostScrollSpyListExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostScrollSpyList} wrapper. */
export const GhostScrollSpyList = defineComponent({
  name: 'GhostScrollSpyList',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostScrollSpyListElement>,
      default: 'ol',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostScrollSpyListExposed | null>(null)
    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostScrollSpyListExposed)
    return () =>
      h(
        GhostUnstyledScrollSpyList,
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
