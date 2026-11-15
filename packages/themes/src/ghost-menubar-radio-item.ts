import { defineComponent, h, ref, type Component, type PropType } from 'vue'

import {
  GhostMenubarRadioItem as GhostUnstyledMenubarRadioItem,
  type GhostMenubarRadioItemElement,
  type GhostMenubarRadioItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarRadioItem} wrapper. */
export const GhostMenubarRadioItem = defineComponent({
  name: 'GhostMenubarRadioItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostMenubarRadioItemElement>,
      default: 'div',
    },
    value: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    select: (value: string, event: Event) =>
      typeof value === 'string' && event instanceof Event,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inner = ref<GhostMenubarRadioItemExposed | null>(null)

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
    } satisfies GhostMenubarRadioItemExposed)

    const UnstyledRadioItem = GhostUnstyledMenubarRadioItem as Component

    return () =>
      h(
        UnstyledRadioItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          disabled: props.disabled,
          onSelect: (value: string, event: Event) => {
            emit('select', value, event)
          },
        },
        slots,
      )
  },
})

export type { GhostMenubarRadioItemElement, GhostMenubarRadioItemExposed }
