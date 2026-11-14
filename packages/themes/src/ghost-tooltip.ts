import { defineComponent, h, type PropType } from 'vue'

import {
  GhostTooltip as GhostUnstyledTooltip,
  type GhostTooltipSlotProps,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTooltip} root wrapper.
 * Importing it loads the default stylesheet; behavior stays on the unstyled primitive.
 */
export const GhostTooltip = defineComponent({
  name: 'GhostTooltip',
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
    delayDuration: {
      type: Number,
      default: 700,
    },
    skipDelayDuration: {
      type: Number,
      default: 300,
    },
    disableHoverableContent: {
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
        GhostUnstyledTooltip,
        {
          ...attrs,
          open: props.open,
          defaultOpen: props.defaultOpen,
          delayDuration: props.delayDuration,
          skipDelayDuration: props.skipDelayDuration,
          disableHoverableContent: props.disableHoverableContent,
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots as {
          default?: (slotProps: GhostTooltipSlotProps) => unknown
        },
      )
  },
})

export type { GhostTooltipSlotProps }
