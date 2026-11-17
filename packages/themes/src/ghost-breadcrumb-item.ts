import { defineComponent, h, type PropType } from 'vue'

import {
  GhostBreadcrumbItem as GhostUnstyledBreadcrumbItem,
  type GhostBreadcrumbItemElement,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbItem} wrapper. */
export const GhostBreadcrumbItem = defineComponent({
  name: 'GhostBreadcrumbItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbItemElement>,
      default: 'li',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledBreadcrumbItem,
        {
          ...attrs,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})
