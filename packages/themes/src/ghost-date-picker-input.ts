import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDatePickerInput as GhostUnstyledDatePickerInput,
  type GhostDatePickerInputExposed,
  type GhostDatePickerPart,
} from '@ghostvue/vue'

/** Themed {@link GhostDatePickerInput}: text field recipe via `data-themed`. */
export const GhostDatePickerInput = defineComponent({
  name: 'GhostDatePickerInput',
  inheritAttrs: false,
  props: {
    part: {
      type: String as PropType<GhostDatePickerPart>,
      default: 'single',
    },
    disabled: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
  },
  setup(props, { attrs, expose }) {
    const inner = ref<GhostDatePickerInputExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostDatePickerInputExposed)

    return () =>
      h(GhostUnstyledDatePickerInput, {
        ...attrs,
        ref: inner,
        part: props.part,
        disabled: props.disabled,
        invalid: props.invalid,
        required: props.required,
        'data-themed': '',
      })
  },
})

export type { GhostDatePickerInputExposed }
