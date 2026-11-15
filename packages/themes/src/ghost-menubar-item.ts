import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostMenubarItem as GhostUnstyledMenubarItem,
  type GhostMenubarItemElement,
  type GhostMenubarItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarItem} wrapper. */
export const GhostMenubarItem = defineComponent({
  name: 'GhostMenubarItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostMenubarItemElement>,
      default: 'div',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    select: (event: Event) => event instanceof Event,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inner = ref<GhostMenubarItemExposed | null>(null)

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
    } satisfies GhostMenubarItemExposed)

    return () =>
      h(
        GhostUnstyledMenubarItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
          onSelect: (event: Event) => {
            emit('select', event)
          },
        },
        slots,
      )
  },
})

export type { GhostMenubarItemElement, GhostMenubarItemExposed }
