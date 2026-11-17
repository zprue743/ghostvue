import { defineComponent, h, type PropType } from 'vue'

import {
  GhostBreadcrumbSeparator as GhostUnstyledBreadcrumbSeparator,
  type GhostBreadcrumbSeparatorElement,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbSeparator} wrapper. */
export const GhostBreadcrumbSeparator = defineComponent({
  name: 'GhostBreadcrumbSeparator',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbSeparatorElement>,
      default: 'span',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledBreadcrumbSeparator,
        {
          ...attrs,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})
