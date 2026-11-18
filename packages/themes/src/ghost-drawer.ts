import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDrawer as GhostUnstyledDrawer,
  type GhostDrawerDirection,
  type GhostDrawerSide,
  type GhostDrawerSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDrawer} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostDrawer = defineComponent({
  name: 'GhostDrawer',
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
    modal: {
      type: Boolean,
      default: true,
    },
    side: {
      type: String as PropType<GhostDrawerSide>,
      default: 'end',
    },
    dir: {
      type: String as PropType<GhostDrawerDirection | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledDrawer,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          modal: props.modal,
          side: props.side,
          dir: props.dir,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostDrawerSlotProps) => unknown
        },
      )
  },
})

export type { GhostDrawerDirection, GhostDrawerSide, GhostDrawerSlotProps }
