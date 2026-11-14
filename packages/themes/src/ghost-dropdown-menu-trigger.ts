import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDropdownMenuTrigger as GhostUnstyledDropdownMenuTrigger,
  type GhostDropdownMenuTriggerElement,
  type GhostDropdownMenuTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuTrigger} wrapper. */
export const GhostDropdownMenuTrigger = defineComponent({
  name: 'GhostDropdownMenuTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDropdownMenuTriggerExposed | null>(null)

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
    } satisfies GhostDropdownMenuTriggerExposed)

    return () =>
      h(
        GhostUnstyledDropdownMenuTrigger,
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

export type { GhostDropdownMenuTriggerElement, GhostDropdownMenuTriggerExposed }