import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostBreadcrumb as GhostUnstyledBreadcrumb,
  GhostBreadcrumbEllipsis as GhostUnstyledBreadcrumbEllipsis,
  GhostBreadcrumbItem as GhostUnstyledBreadcrumbItem,
  GhostBreadcrumbLink as GhostUnstyledBreadcrumbLink,
  GhostBreadcrumbList as GhostUnstyledBreadcrumbList,
  GhostBreadcrumbPage as GhostUnstyledBreadcrumbPage,
  GhostBreadcrumbSeparator as GhostUnstyledBreadcrumbSeparator,
  type GhostBreadcrumbElement,
  type GhostBreadcrumbItemElement,
  type GhostBreadcrumbLinkElement,
  type GhostBreadcrumbLinkExposed,
  type GhostBreadcrumbListElement,
  type GhostBreadcrumbPageElement,
  type GhostBreadcrumbSeparatorElement,
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
} from '@ghostvue/vue'
