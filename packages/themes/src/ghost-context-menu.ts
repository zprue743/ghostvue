import { defineComponent, h, type PropType } from 'vue'

import {
  GhostContextMenu as GhostUnstyledContextMenu,
  type GhostContextMenuSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostContextMenu} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostContextMenu = defineComponent({
  name: 'GhostContextMenu',
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
        GhostUnstyledContextMenu,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostContextMenuSlotProps) => unknown
        },
      )
  },
})

export type { GhostContextMenuSlotProps }
