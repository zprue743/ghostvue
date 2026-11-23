import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCommandPaletteContent as GhostUnstyledCommandPaletteContent,
  type GhostCommandPaletteContentElement,
  type GhostCommandPaletteContentExposed,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostCommandPaletteContent} wrapper. Sets `data-themed` so the
 * portaled surface and its input, list, groups, and items pick up the
 * elevation-4 dialog and combobox list tokens outside any `.ghost-theme` host.
 */
export const GhostCommandPaletteContent = defineComponent({
  name: 'GhostCommandPaletteContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostCommandPaletteContentElement>,
      default: 'div',
    },
    closeOnEscape: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    closeOnOutsideClick: { type: Boolean, default: true },
    portal: { type: Boolean, default: true },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
    focusReady: { type: Boolean, default: true },
    initialFocus: {
      type: Function as PropType<(() => HTMLElement | null) | undefined>,
      default: undefined,
    },
    returnFocus: {
      type: Function as PropType<(() => HTMLElement | null) | undefined>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostCommandPaletteContentExposed | null>(null)

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
    } satisfies GhostCommandPaletteContentExposed)

    return () =>
      h(
        GhostUnstyledCommandPaletteContent,
        { ...attrs, ...props, ref: inner, 'data-themed': '' },
        slots,
      )
  },
})

export type {
  GhostCommandPaletteContentElement,
  GhostCommandPaletteContentExposed,
}
