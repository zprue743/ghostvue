import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSelectContent as GhostUnstyledSelectContent,
  type GhostSelectContentElement,
  type GhostSelectContentExposed,
  type GhostSelectFlipOptions,
  type GhostSelectOffsetOptions,
  type GhostSelectPlacement,
  type GhostSelectShiftOptions,
  type GhostSelectStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/** Themed {@link GhostSelectContent} wrapper. */
export const GhostSelectContent = defineComponent({
  name: 'GhostSelectContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostSelectContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostSelectPlacement>,
      default: 'bottom',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostSelectOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostSelectFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostSelectShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostSelectStrategy>,
      default: 'absolute',
    },
    portal: { type: Boolean, default: true },
    portalTo: {
      type: [String, Object, null] as PropType<GhostPortalTarget>,
      default: 'body',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostSelectContentExposed | null>(null)

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
    } satisfies GhostSelectContentExposed)

    return () =>
      h(
        GhostUnstyledSelectContent,
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
  GhostSelectContentElement,
  GhostSelectContentExposed,
  GhostSelectFlipOptions,
  GhostSelectOffsetOptions,
  GhostSelectPlacement,
  GhostSelectShiftOptions,
  GhostSelectStrategy,
}
