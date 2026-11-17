import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostComboboxContent as GhostUnstyledComboboxContent,
  type GhostComboboxContentElement,
  type GhostComboboxContentExposed,
  type GhostComboboxFlipOptions,
  type GhostComboboxOffsetOptions,
  type GhostComboboxPlacement,
  type GhostComboboxShiftOptions,
  type GhostComboboxStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/** Themed {@link GhostComboboxContent} wrapper. */
export const GhostComboboxContent = defineComponent({
  name: 'GhostComboboxContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostComboboxContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostComboboxPlacement>,
      default: 'bottom',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostComboboxOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostComboboxFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostComboboxShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostComboboxStrategy>,
      default: 'absolute',
    },
    portal: { type: Boolean, default: true },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostComboboxContentExposed | null>(null)

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
    } satisfies GhostComboboxContentExposed)

    return () =>
      h(
        GhostUnstyledComboboxContent,
        {
          ...attrs,
          ref: inner,
          ...props,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostComboboxContentElement,
  GhostComboboxContentExposed,
  GhostComboboxFlipOptions,
  GhostComboboxOffsetOptions,
  GhostComboboxPlacement,
  GhostComboboxShiftOptions,
  GhostComboboxStrategy,
}
