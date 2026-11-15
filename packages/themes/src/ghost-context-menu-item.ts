import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostContextMenuItem as GhostUnstyledContextMenuItem,
  type GhostContextMenuItemElement,
  type GhostContextMenuItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuItem} wrapper. */
export const GhostContextMenuItem = defineComponent({
  name: 'GhostContextMenuItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostContextMenuItemElement>,
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
    const inner = ref<GhostContextMenuItemExposed | null>(null)

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
    } satisfies GhostContextMenuItemExposed)

    return () =>
      h(
        GhostUnstyledContextMenuItem,
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

export type { GhostContextMenuItemElement, GhostContextMenuItemExposed }
