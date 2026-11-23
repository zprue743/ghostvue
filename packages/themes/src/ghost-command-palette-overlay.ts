import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCommandPaletteOverlay as GhostUnstyledCommandPaletteOverlay,
  type GhostCommandPaletteOverlayElement,
  type GhostCommandPaletteOverlayExposed,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostCommandPaletteOverlay} wrapper. Sets `data-themed` so the
 * portaled backdrop picks up `--ghost-scrim` outside any `.ghost-theme` host.
 */
export const GhostCommandPaletteOverlay = defineComponent({
  name: 'GhostCommandPaletteOverlay',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostCommandPaletteOverlayElement>,
      default: 'div',
    },
    portal: { type: Boolean, default: true },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostCommandPaletteOverlayExposed | null>(null)

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
    } satisfies GhostCommandPaletteOverlayExposed)

    return () =>
      h(
        GhostUnstyledCommandPaletteOverlay,
        { ...attrs, ...props, ref: inner, 'data-themed': '' },
        slots,
      )
  },
})

export type {
  GhostCommandPaletteOverlayElement,
  GhostCommandPaletteOverlayExposed,
}
