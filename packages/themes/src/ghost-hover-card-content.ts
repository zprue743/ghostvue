import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostHoverCardContent as GhostUnstyledHoverCardContent,
  type GhostHoverCardContentElement,
  type GhostHoverCardContentExposed,
  type GhostHoverCardFlipOptions,
  type GhostHoverCardOffsetOptions,
  type GhostHoverCardPlacement,
  type GhostPortalTarget,
  type GhostHoverCardShiftOptions,
  type GhostHoverCardStrategy,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostHoverCardContent} wrapper.
 * Sets `data-themed` so portaled cards pick up elevation and surface tokens.
 */
export const GhostHoverCardContent = defineComponent({
  name: 'GhostHoverCardContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostHoverCardContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostHoverCardPlacement>,
      default: 'bottom',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostHoverCardOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostHoverCardFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostHoverCardShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostHoverCardStrategy>,
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
    const inner = ref<GhostHoverCardContentExposed | null>(null)

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
    } satisfies GhostHoverCardContentExposed)

    return () =>
      h(
        GhostUnstyledHoverCardContent,
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
  GhostHoverCardContentElement,
  GhostHoverCardContentExposed,
  GhostHoverCardFlipOptions,
  GhostHoverCardOffsetOptions,
  GhostHoverCardPlacement,
  GhostHoverCardShiftOptions,
  GhostHoverCardStrategy,
}
