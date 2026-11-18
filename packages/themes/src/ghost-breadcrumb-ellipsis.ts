import { defineComponent, h } from 'vue'

import { GhostBreadcrumbEllipsis as GhostUnstyledBreadcrumbEllipsis } from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbEllipsis} wrapper. */
export const GhostBreadcrumbEllipsis = defineComponent({
  name: 'GhostBreadcrumbEllipsis',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: 'Show more breadcrumb segments',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledBreadcrumbEllipsis,
        {
          ...attrs,
          label: props.label,
          'data-themed': '',
        },
        slots,
      )
  },
})
