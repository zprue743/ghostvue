import { defineComponent, h, ref, type Component, type PropType } from 'vue'

import {
  GhostDropdownMenuRadioItem as GhostUnstyledDropdownMenuRadioItem,
  type GhostDropdownMenuRadioItemElement,
  type GhostDropdownMenuRadioItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuRadioItem} wrapper. */
export const GhostDropdownMenuRadioItem = defineComponent({
  name: 'GhostDropdownMenuRadioItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostDropdownMenuRadioItemElement>,
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
    const inner = ref<GhostDropdownMenuRadioItemExposed | null>(null)

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
    } satisfies GhostDropdownMenuRadioItemExposed)

    const UnstyledRadioItem = GhostUnstyledDropdownMenuRadioItem as Component

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
  GhostDropdownMenuRadioItemElement,
  GhostDropdownMenuRadioItemExposed,
}
