import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostBreadcrumbLink as GhostUnstyledBreadcrumbLink,
  type GhostBreadcrumbLinkElement,
  type GhostBreadcrumbLinkExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostBreadcrumbLink} wrapper. */
export const GhostBreadcrumbLink = defineComponent({
  name: 'GhostBreadcrumbLink',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<GhostBreadcrumbLinkElement>,
      default: 'a',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostBreadcrumbLinkExposed | null>(null)
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
    } satisfies GhostBreadcrumbLinkExposed)
    return () =>
      h(
        GhostUnstyledBreadcrumbLink,
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
