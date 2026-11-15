import { defineComponent, h, type PropType } from 'vue'

import {
  GhostHoverCard as GhostUnstyledHoverCard,
  type GhostHoverCardSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostHoverCard} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostHoverCard = defineComponent({
  name: 'GhostHoverCard',
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultOpen: {
      type: Boolean,
      default: false,
    },
    openDelay: {
      type: Number,
      default: 700,
    },
    closeDelay: {
      type: Number,
      default: 300,
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledHoverCard,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          openDelay: props.openDelay,
          closeDelay: props.closeDelay,
          closeOnEscape: props.closeOnEscape,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostHoverCardSlotProps) => unknown
        },
      )
  },
})

export type { GhostHoverCardSlotProps }
