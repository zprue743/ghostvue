import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTreeTrigger as GhostUnstyledTreeTrigger,
  type GhostTreeTriggerAction,
  type GhostTreeTriggerElement,
  type GhostTreeTriggerExposed,
  type GhostTreeTriggerSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTreeTrigger} wrapper. Keeps the component name
 * `GhostTreeTrigger` so the item's server-render slot scan recognizes it.
 */
export const GhostTreeTrigger = defineComponent({
  name: 'GhostTreeTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTreeTriggerElement>,
      default: 'span',
    },
    action: {
      type: String as PropType<GhostTreeTriggerAction>,
      default: 'both',
    },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTreeTriggerExposed | null>(null)

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
    } satisfies GhostTreeTriggerExposed)

    return () =>
      h(
        GhostUnstyledTreeTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          action: props.action,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots as {
          default?: (slotProps: GhostTreeTriggerSlotProps) => unknown
        },
      )
  },
})

export type {
  GhostTreeTriggerAction,
  GhostTreeTriggerElement,
  GhostTreeTriggerExposed,
  GhostTreeTriggerSlotProps,
}
