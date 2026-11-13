import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogOverlay as GhostUnstyledDialogOverlay,
  type GhostDialogOverlayElement,
  type GhostDialogOverlayExposed,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDialogOverlay} wrapper.
 * Sets `data-themed` so portaled backdrops pick up `--ghost-scrim` tokens.
 */
export const GhostDialogOverlay = defineComponent({
  name: 'GhostDialogOverlay',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDialogOverlayElement>,
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
    const inner = ref<GhostDialogOverlayExposed | null>(null)

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
    } satisfies GhostDialogOverlayExposed)

    return () =>
      h(
        GhostUnstyledDialogOverlay,
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
  GhostDialogOverlayElement,
  GhostDialogOverlayExposed,
  GhostPortalTarget,
}
