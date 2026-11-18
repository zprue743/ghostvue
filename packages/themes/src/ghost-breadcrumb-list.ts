import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostBreadcrumbList as GhostUnstyledBreadcrumbList,
  type GhostBreadcrumbListElement,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbList} wrapper. */
export const GhostBreadcrumbList = defineComponent({
  name: 'GhostBreadcrumbList',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbListElement>,
      default: 'ol',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<{ element: HTMLElement | null } | null>(null)
    expose({
      get element() {
        return inner.value?.element ?? null
      },
    })
    return () =>
      h(
        GhostUnstyledBreadcrumbList,
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
