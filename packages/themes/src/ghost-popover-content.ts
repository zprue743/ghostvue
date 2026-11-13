import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostPopoverContent as GhostUnstyledPopoverContent,
  type GhostPopoverContentElement,
  type GhostPopoverContentExposed,
  type GhostPopoverFlipOptions,
  type GhostPopoverOffsetOptions,
  type GhostPopoverPlacement,
  type GhostPopoverShiftOptions,
  type GhostPopoverStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostPopoverContent} wrapper.
 * Sets `data-themed` so portaled popovers pick up elevation, radius, border,
 * and surface tokens inside any `.ghost-theme` / `[data-ghost-theme]` host.
 */
export const GhostPopoverContent = defineComponent({
  name: 'GhostPopoverContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostPopoverContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostPopoverPlacement>,
      default: 'bottom',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostPopoverOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostPopoverFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostPopoverShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostPopoverStrategy>,
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
    const inner = ref<GhostPopoverContentExposed | null>(null)

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
    } satisfies GhostPopoverContentExposed)

    return () =>
      h(
        GhostUnstyledPopoverContent,
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
  GhostPopoverContentElement,
  GhostPopoverContentExposed,
  GhostPopoverFlipOptions,
  GhostPopoverOffsetOptions,
  GhostPopoverPlacement,
  GhostPopoverShiftOptions,
  GhostPopoverStrategy,
  GhostPortalTarget,
}
