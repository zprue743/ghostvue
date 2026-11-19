import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerContent as GhostUnstyledDrawerContent,
  type GhostDrawerContentElement,
  type GhostDrawerContentExposed,
  type GhostDrawerContentRole,
  type GhostDrawerDirection,
  type GhostDrawerSide,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDrawerContent} wrapper.
 * Sets `data-themed` so portaled drawers pick up elevation-4, radius, border,
 * surface tokens, edge placement, and the reduced-motion-aware slide entry
 * inside any `.ghost-theme` / `[data-ghost-theme]` host.
 */
export const GhostDrawerContent = defineComponent({
  name: 'GhostDrawerContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDrawerContentElement>,
      default: 'div',
    },
    side: {
      type: String as PropType<GhostDrawerSide | undefined>,
      default: undefined,
    },
    dir: {
      type: String as PropType<GhostDrawerDirection | undefined>,
      default: undefined,
    },
    role: {
      type: String as PropType<GhostDrawerContentRole>,
      default: 'dialog',
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    closeOnOutsideClick: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    portal: {
      type: Boolean,
      default: true,
    },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDrawerContentExposed | null>(null)

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
    } satisfies GhostDrawerContentExposed)

    return () =>
      h(
        GhostUnstyledDrawerContent,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          side: props.side,
          dir: props.dir,
          role: props.role,
          closeOnEscape: props.closeOnEscape,
          closeOnOutsideClick: props.closeOnOutsideClick,
          portal: props.portal,
          portalTo: props.portalTo,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostDrawerContentElement,
  GhostDrawerContentExposed,
  GhostDrawerContentRole,
  GhostDrawerDirection,
  GhostDrawerSide,
  GhostPortalTarget,
}
