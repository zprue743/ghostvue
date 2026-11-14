import { defineComponent, h, type PropType } from 'vue'

import {
  GhostCollapsible as GhostUnstyledCollapsible,
  type GhostCollapsibleSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostCollapsible} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostCollapsible = defineComponent({
  name: 'GhostCollapsible',
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
    disabled: {
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
        GhostUnstyledCollapsible,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          disabled: props.disabled,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostCollapsibleSlotProps) => unknown
        },
      )
  },
})

export type { GhostCollapsibleSlotProps }
