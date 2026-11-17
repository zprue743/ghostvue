import { defineComponent, h, type PropType } from 'vue'

import {
  GhostBreadcrumbPage as GhostUnstyledBreadcrumbPage,
  type GhostBreadcrumbPageElement,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbPage} wrapper. */
export const GhostBreadcrumbPage = defineComponent({
  name: 'GhostBreadcrumbPage',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbPageElement>,
      default: 'span',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledBreadcrumbPage,
        {
          ...attrs,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})
