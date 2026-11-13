import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogTrigger as GhostUnstyledDialogTrigger,
  type GhostDialogTriggerElement,
  type GhostDialogTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDialogTrigger} wrapper. */
export const GhostDialogTrigger = defineComponent({
  name: 'GhostDialogTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDialogTriggerElement>,
      default: 'button',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDialogTriggerExposed | null>(null)

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
    } satisfies GhostDialogTriggerExposed)

    return () =>
      h(
        GhostUnstyledDialogTrigger,
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

export type { GhostDialogTriggerElement, GhostDialogTriggerExposed }
