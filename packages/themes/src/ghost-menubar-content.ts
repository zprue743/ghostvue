import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostMenubarContent as GhostUnstyledMenubarContent,
  type GhostMenubarContentElement,
  type GhostMenubarContentExposed,
  type GhostMenubarFlipOptions,
  type GhostMenubarOffsetOptions,
  type GhostMenubarPlacement,
  type GhostMenubarShiftOptions,
  type GhostMenubarStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostMenubarContent} wrapper.
 * Sets `data-themed` so portaled menus pick up elevation and item tokens.
 */
export const GhostMenubarContent = defineComponent({
  name: 'GhostMenubarContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostMenubarContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostMenubarPlacement>,
      default: 'bottom-start',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostMenubarOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostMenubarFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostMenubarShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostMenubarStrategy>,
      default: 'absolute',
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
    const inner = ref<GhostMenubarContentExposed | null>(null)

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
    } satisfies GhostMenubarContentExposed)

    return () =>
      h(
        GhostUnstyledMenubarContent,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          placement: props.placement,
          offset: props.offset,
          flip: props.flip,
          shift: props.shift,
          strategy: props.strategy,
          portal: props.portal,
          portalTo: props.portalTo,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostMenubarContentElement,
  GhostMenubarContentExposed,
  GhostMenubarFlipOptions,
  GhostMenubarOffsetOptions,
  GhostMenubarPlacement,
  GhostMenubarShiftOptions,
  GhostMenubarStrategy,
  GhostPortalTarget,
}
