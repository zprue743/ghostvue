import { defineComponent, h, ref, type Component, type PropType } from 'vue'

import {
  GhostContextMenuRadioItem as GhostUnstyledContextMenuRadioItem,
  type GhostContextMenuRadioItemElement,
  type GhostContextMenuRadioItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuRadioItem} wrapper. */
export const GhostContextMenuRadioItem = defineComponent({
  name: 'GhostContextMenuRadioItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuRadioItemElement>,
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
    const inner = ref<GhostContextMenuRadioItemExposed | null>(null)

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
    } satisfies GhostContextMenuRadioItemExposed)

    const UnstyledRadioItem = GhostUnstyledContextMenuRadioItem as Component

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

export type {
  GhostContextMenuRadioItemElement,
  GhostContextMenuRadioItemExposed,
}
