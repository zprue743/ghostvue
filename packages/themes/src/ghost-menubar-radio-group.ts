import { defineComponent, h, type PropType } from 'vue'

import {
  GhostMenubarRadioGroup as GhostUnstyledMenubarRadioGroup,
  type GhostMenubarRadioGroupElement,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarRadioGroup} wrapper. */
export const GhostMenubarRadioGroup = defineComponent({
  name: 'GhostMenubarRadioGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostMenubarRadioGroupElement>,
      default: 'div',
    },
    modelValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
  },
  setup(props, { attrs, slots, emit }) {
    return () =>
      h(
        GhostUnstyledMenubarRadioGroup,
        {
          ...attrs,
          as: props.as,
          ...(props.modelValue !== undefined
            ? { modelValue: props.modelValue }
            : {}),
          defaultValue: props.defaultValue,
          disabled: props.disabled,
          'onUpdate:modelValue': (value: string) => {
            emit('update:modelValue', value)
          },
        },
        slots,
      )
  },
})

export type { GhostMenubarRadioGroupElement }
