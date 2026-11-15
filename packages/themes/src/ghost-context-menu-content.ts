import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostContextMenuContent as GhostUnstyledContextMenuContent,
  type GhostContextMenuContentElement,
  type GhostContextMenuContentExposed,
  type GhostContextMenuFlipOptions,
  type GhostContextMenuOffsetOptions,
  type GhostContextMenuPlacement,
  type GhostContextMenuShiftOptions,
  type GhostContextMenuStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostContextMenuContent} wrapper.
 * Sets `data-themed` so portaled menus pick up elevation and item tokens.
 */
export const GhostContextMenuContent = defineComponent({
  name: 'GhostContextMenuContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostContextMenuPlacement>,
      default: 'bottom-start',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostContextMenuOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<
        boolean | GhostContextMenuFlipOptions
      >,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<
        boolean | GhostContextMenuShiftOptions
      >,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostContextMenuStrategy>,
      default: 'fixed',
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
    const inner = ref<GhostContextMenuContentExposed | null>(null)

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
    } satisfies GhostContextMenuContentExposed)

    return () =>
      h(
        GhostUnstyledContextMenuContent,
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
  GhostContextMenuContentElement,
  GhostContextMenuContentExposed,
  GhostContextMenuFlipOptions,
  GhostContextMenuOffsetOptions,
  GhostContextMenuPlacement,
  GhostContextMenuShiftOptions,
  GhostContextMenuStrategy,
  GhostPortalTarget,
}
