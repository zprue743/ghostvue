import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostContextMenuTrigger as GhostUnstyledContextMenuTrigger,
  type GhostContextMenuTriggerElement,
  type GhostContextMenuTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuTrigger} wrapper. */
export const GhostContextMenuTrigger = defineComponent({
  name: 'GhostContextMenuTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostContextMenuTriggerExposed | null>(null)

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
    } satisfies GhostContextMenuTriggerExposed)

    return () =>
      h(
        GhostUnstyledContextMenuTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
        },
        slots,
      )
  },
})

export type { GhostContextMenuTriggerElement, GhostContextMenuTriggerExposed }
