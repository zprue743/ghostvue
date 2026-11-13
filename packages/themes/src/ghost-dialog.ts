import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDialog as GhostUnstyledDialog,
  type GhostDialogSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostDialog} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostDialog = defineComponent({
  name: 'GhostDialog',
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
  },
  emits: {
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledDialog,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          modal: props.modal,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostDialogSlotProps) => unknown
        },
      )
  },
})

export type { GhostDialogSlotProps }
