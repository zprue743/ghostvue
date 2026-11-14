import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDropdownMenuItem as GhostUnstyledDropdownMenuItem,
  type GhostDropdownMenuItemElement,
  type GhostDropdownMenuItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuItem} wrapper. */
export const GhostDropdownMenuItem = defineComponent({
  name: 'GhostDropdownMenuItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuItemElement>,
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
    const inner = ref<GhostDropdownMenuItemExposed | null>(null)

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
    } satisfies GhostDropdownMenuItemExposed)

    return () =>
      h(
        GhostUnstyledDropdownMenuItem,
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

export type { GhostDropdownMenuItemElement, GhostDropdownMenuItemExposed }