import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDropdownMenuContent as GhostUnstyledDropdownMenuContent,
  type GhostDropdownMenuContentElement,
  type GhostDropdownMenuContentExposed,
  type GhostDropdownMenuFlipOptions,
  type GhostDropdownMenuOffsetOptions,
  type GhostDropdownMenuPlacement,
  type GhostDropdownMenuShiftOptions,
  type GhostDropdownMenuStrategy,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDropdownMenuContent} wrapper.
 * Sets `data-themed` so portaled menus pick up elevation and item tokens.
 */
export const GhostDropdownMenuContent = defineComponent({
  name: 'GhostDropdownMenuContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuContentElement>,
      default: 'div',
    },
    placement: {
      type: String as PropType<GhostDropdownMenuPlacement>,
      default: 'bottom',
    },
    offset: {
      type: [Number, Object, Boolean] as PropType<
        GhostDropdownMenuOffsetOptions | boolean | undefined
      >,
      default: undefined,
    },
    flip: {
      type: [Boolean, Object] as PropType<boolean | GhostDropdownMenuFlipOptions>,
      default: true,
    },
    shift: {
      type: [Boolean, Object] as PropType<boolean | GhostDropdownMenuShiftOptions>,
      default: true,
    },
    strategy: {
      type: String as PropType<GhostDropdownMenuStrategy>,
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
    const inner = ref<GhostDropdownMenuContentExposed | null>(null)

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
    } satisfies GhostDropdownMenuContentExposed)

    return () =>
      h(
        GhostUnstyledDropdownMenuContent,
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
  GhostDropdownMenuContentElement,
  GhostDropdownMenuContentExposed,
  GhostDropdownMenuFlipOptions,
  GhostDropdownMenuOffsetOptions,
  GhostDropdownMenuPlacement,
  GhostDropdownMenuShiftOptions,
  GhostDropdownMenuStrategy,
  GhostPortalTarget,
}