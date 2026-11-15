import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostComboboxTrigger as GhostUnstyledComboboxTrigger,
  type GhostComboboxTriggerElement,
  type GhostComboboxTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostComboboxTrigger} wrapper. */
export const GhostComboboxTrigger = defineComponent({
  name: 'GhostComboboxTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostComboboxTriggerElement>,
      default: 'button',
    },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostComboboxTriggerExposed | null>(null)

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
    } satisfies GhostComboboxTriggerExposed)

    return () =>
      h(
        GhostUnstyledComboboxTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disabled: props.disabled,
          class: ['ghost-combobox-trigger', attrs.class],
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostComboboxTriggerElement, GhostComboboxTriggerExposed }