import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTooltipContent as GhostUnstyledTooltipContent,
  type GhostTooltipContentElement,
  type GhostTooltipContentExposed,
  type GhostTooltipFlipOptions,
  type GhostTooltipOffsetOptions,
  type GhostTooltipPlacement,
  type GhostTooltipShiftOptions,
  type GhostTooltipStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTooltipContent} wrapper.
 * Sets `data-themed` so portaled tooltips pick up elevation, radius, border,
 * and surface tokens inside any `.ghost-theme` / `[data-ghost-theme]` host.
 */
export const GhostTooltipContent = defineComponent({
  name: 'GhostTooltipContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTooltipContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostTooltipPlacement>,
      default: 'top',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostTooltipOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostTooltipFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostTooltipShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostTooltipStrategy>,
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
    const inner = ref<GhostTooltipContentExposed | null>(null)

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
    } satisfies GhostTooltipContentExposed)

    return () =>
      h(
        GhostUnstyledTooltipContent,
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
  GhostTooltipContentElement,
  GhostTooltipContentExposed,
  GhostTooltipFlipOptions,
  GhostTooltipOffsetOptions,
  GhostTooltipPlacement,
  GhostTooltipShiftOptions,
  GhostTooltipStrategy,
  GhostPortalTarget,
}
