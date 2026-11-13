import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogContent as GhostUnstyledDialogContent,
  type GhostDialogContentElement,
  type GhostDialogContentExposed,
  type GhostDialogContentRole,
  type GhostPortalTarget,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDialogContent} wrapper.
 * Sets `data-themed` so portaled dialogs pick up elevation-4, radius, border,
 * and surface tokens inside any `.ghost-theme` / `[data-ghost-theme]` host.
 */
export const GhostDialogContent = defineComponent({
  name: 'GhostDialogContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDialogContentElement>,
      default: 'div',
    },
    role: {
      type: String as PropType<GhostDialogContentRole>,
      default: 'dialog',
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    closeOnOutsideClick: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
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
    const inner = ref<GhostDialogContentExposed | null>(null)

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
    } satisfies GhostDialogContentExposed)

    return () =>
      h(
        GhostUnstyledDialogContent,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          role: props.role,
          closeOnEscape: props.closeOnEscape,
          closeOnOutsideClick: props.closeOnOutsideClick,
          portal: props.portal,
          portalTo: props.portalTo,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type {
  GhostDialogContentElement,
  GhostDialogContentExposed,
  GhostDialogContentRole,
  GhostPortalTarget,
}
