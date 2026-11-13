import { defineComponent, h, type PropType } from 'vue'

import {
  GhostPopover as GhostUnstyledPopover,
  type GhostPopoverSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostPopover} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostPopover = defineComponent({
  name: 'GhostPopover',
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
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledPopover,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostPopoverSlotProps) => unknown
        },
      )
  },
})

export type { GhostPopoverSlotProps }
