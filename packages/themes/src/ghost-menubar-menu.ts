import { defineComponent, h, type PropType } from 'vue'

import {
  GhostMenubarMenu as GhostUnstyledMenubarMenu,
  type GhostMenubarMenuSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostMenubarMenu} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostMenubarMenu = defineComponent({
  name: 'GhostMenubarMenu',
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
        GhostUnstyledMenubarMenu,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostMenubarMenuSlotProps) => unknown
        },
      )
  },
})

export type { GhostMenubarMenuSlotProps }
