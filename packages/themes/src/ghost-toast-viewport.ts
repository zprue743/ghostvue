import { defineComponent, h, ref, type PropType, type SlotsType } from 'vue'

import {
  GhostToastAction,
  GhostToastClose,
  GhostToastDescription,
  GhostToastTitle,
  GhostToastViewport as GhostUnstyledToastViewport,
  type GhostToastViewportElement,
  type GhostToastViewportExposed,
  type GhostToastViewportItemSlotProps,
  type GhostToastViewportSlotProps,
} from '@ghostvue/vue'

import { GhostToast } from './ghost-toast'

/**
 * Default themed content for one record. It uses the headless parts, so the
 * action still runs `action.onClick` and Close still dismisses through the
 * store. The close icon keeps the headless default's accessible name
 * ("Dismiss") so both layers are found the same way.
 */
function renderDefaultToast({ toast }: GhostToastViewportItemSlotProps) {
  return h(GhostToast, { toast }, () => [
    h(GhostToastTitle, null, () => toast.title),
    toast.description
      ? h(GhostToastDescription, null, () => toast.description)
      : null,
    toast.action ? h(GhostToastAction, null, () => toast.action?.label) : null,
    h(GhostToastClose, { 'aria-label': 'Dismiss' }, () =>
      h(
        'svg',
        {
          'aria-hidden': 'true',
          focusable: 'false',
          viewBox: '0 0 16 16',
          width: '16',
          height: '16',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.5',
          'stroke-linecap': 'round',
        },
        [h('path', { d: 'M4 4l8 8M12 4l-8 8' })],
      ),
    ),
  ])
}

/**
 * Themed {@link GhostToastViewport} wrapper. Sets `data-themed` so the
 * portaled region gets the theme's fixed bottom-end stack (gap, width, and
 * stacking order) outside any `.ghost-theme` host. With `portal: false` it
 * also sets `data-inline`, and the stack stays in normal flow so the
 * surrounding layout places it.
 *
 * Without slots each visible record renders as a themed {@link GhostToast}.
 * A consumer `toast` or `default` slot replaces that content exactly as on
 * the headless viewport.
 */
export const GhostToastViewport = defineComponent({
  name: 'GhostToastViewport',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostToastViewportElement>,
      default: 'div',
    },
    portal: { type: Boolean, default: true },
  },
  slots: Object as SlotsType<{
    /** Replaces the whole stack, as on the headless viewport. */
    default?: (slotProps: GhostToastViewportSlotProps) => unknown
    /** Content of one toast. Defaults to a themed GhostToast. */
    toast?: (slotProps: GhostToastViewportItemSlotProps) => unknown
  }>,
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostToastViewportExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostToastViewportExposed)

    return () => {
      const forwarded: {
        default?: (slotProps: GhostToastViewportSlotProps) => unknown
        toast: (slotProps: GhostToastViewportItemSlotProps) => unknown
      } = { toast: slots.toast ?? renderDefaultToast }
      if (slots.default) {
        forwarded.default = slots.default
      }

      return h(
        GhostUnstyledToastViewport,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          portal: props.portal,
          'data-themed': '',
          'data-inline': props.portal ? undefined : '',
        },
        forwarded,
      )
    }
  },
})

export type {
  GhostToastViewportElement,
  GhostToastViewportExposed,
  GhostToastViewportItemSlotProps,
  GhostToastViewportSlotProps,
}
