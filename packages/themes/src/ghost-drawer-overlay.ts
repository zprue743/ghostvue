import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDrawerOverlay as GhostUnstyledDrawerOverlay,
  type GhostDrawerOverlayElement,
  type GhostDrawerOverlayExposed,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDrawerOverlay} wrapper.
 * Sets `data-themed` so portaled backdrops pick up `--ghost-scrim` tokens.
 */
export const GhostDrawerOverlay = defineComponent({
  name: 'GhostDrawerOverlay',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDrawerOverlayElement>,
      default: 'div',
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
    const inner = ref<GhostDrawerOverlayExposed | null>(null)

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
    } satisfies GhostDrawerOverlayExposed)

    return () =>
      h(
        GhostUnstyledDrawerOverlay,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          portal: props.portal,
          portalTo: props.portalTo,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostDrawerOverlayElement,
  GhostDrawerOverlayExposed,
  GhostPortalTarget,
}
