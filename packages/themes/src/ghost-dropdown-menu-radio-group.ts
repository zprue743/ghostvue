import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDropdownMenuRadioGroup as GhostUnstyledDropdownMenuRadioGroup,
  type GhostDropdownMenuRadioGroupElement,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuRadioGroup} wrapper. */
export const GhostDropdownMenuRadioGroup = defineComponent({
  name: 'GhostDropdownMenuRadioGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuRadioGroupElement>,
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
        GhostUnstyledDropdownMenuRadioGroup,
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

export type { GhostDropdownMenuRadioGroupElement }