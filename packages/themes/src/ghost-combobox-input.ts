import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostComboboxInput as GhostUnstyledComboboxInput,
  type GhostComboboxInputElement,
  type GhostComboboxInputExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostComboboxInput} wrapper. */
export const GhostComboboxInput = defineComponent({
  name: 'GhostComboboxInput',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostComboboxInputElement>,
      default: 'input',
    },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostComboboxInputExposed | null>(null)

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
    } satisfies GhostComboboxInputExposed)

    return () =>
      h(
        GhostUnstyledComboboxInput,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
          class: ['ghost-combobox-input', attrs.class],
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostComboboxInputElement, GhostComboboxInputExposed }
