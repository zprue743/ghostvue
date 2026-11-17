import { defineComponent, h, type PropType } from 'vue'

import {
  GhostBreadcrumb as GhostUnstyledBreadcrumb,
  type GhostBreadcrumbElement,
  type GhostBreadcrumbEllipsisExposed,
  type GhostBreadcrumbEllipsisProps,
  type GhostBreadcrumbExposed,
  type GhostBreadcrumbItemElement,
  type GhostBreadcrumbItemExposed,
  type GhostBreadcrumbLinkElement,
  type GhostBreadcrumbLinkExposed,
  type GhostBreadcrumbListElement,
  type GhostBreadcrumbListExposed,
  type GhostBreadcrumbPageElement,
  type GhostBreadcrumbPageExposed,
  type GhostBreadcrumbProps,
  type GhostBreadcrumbSeparatorElement,
  type GhostBreadcrumbSeparatorExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumb} root wrapper. */
export const GhostBreadcrumb = defineComponent({
  name: 'GhostBreadcrumb',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbElement>,
      default: 'nav',
    },
    ariaLabel: { type: String, default: 'Breadcrumb' },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledBreadcrumb,
        {
          ...attrs,
          as: props.as,
          ariaLabel: props.ariaLabel,
        },
        slots,
      )
  },
})

export { GhostBreadcrumbList } from './ghost-breadcrumb-list'
export { GhostBreadcrumbItem } from './ghost-breadcrumb-item'
export { GhostBreadcrumbLink } from './ghost-breadcrumb-link'
export { GhostBreadcrumbPage } from './ghost-breadcrumb-page'
export { GhostBreadcrumbSeparator } from './ghost-breadcrumb-separator'
export { GhostBreadcrumbEllipsis } from './ghost-breadcrumb-ellipsis'

export type {
  GhostBreadcrumbElement,
  GhostBreadcrumbEllipsisExposed,
  GhostBreadcrumbEllipsisProps,
  GhostBreadcrumbExposed,
  GhostBreadcrumbItemElement,
  GhostBreadcrumbItemExposed,
  GhostBreadcrumbLinkElement,
  GhostBreadcrumbLinkExposed,
  GhostBreadcrumbListElement,
  GhostBreadcrumbListExposed,
  GhostBreadcrumbPageElement,
  GhostBreadcrumbPageExposed,
  GhostBreadcrumbProps,
  GhostBreadcrumbSeparatorElement,
  GhostBreadcrumbSeparatorExposed,
}
