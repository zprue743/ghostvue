import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDropdownMenu as GhostUnstyledDropdownMenu,
  type GhostDropdownMenuSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDropdownMenu} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostDropdownMenu = defineComponent({
  name: 'GhostDropdownMenu',
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
        GhostUnstyledDropdownMenu,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostDropdownMenuSlotProps) => unknown
        },
      )
  },
})

export type { GhostDropdownMenuSlotProps }
