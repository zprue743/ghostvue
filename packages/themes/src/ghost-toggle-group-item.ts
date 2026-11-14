import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostToggleGroupItem as GhostUnstyledToggleGroupItem,
  type GhostToggleGroupItemElement,
  type GhostToggleGroupItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostToggleGroupItem} wrapper. */
export const GhostToggleGroupItem = defineComponent({
  name: 'GhostToggleGroupItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostToggleGroupItemElement>,
      default: 'button',
    },
    value: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostToggleGroupItemExposed | null>(null)

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
    } satisfies GhostToggleGroupItemExposed)

    return () =>
      h(
        GhostUnstyledToggleGroupItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostToggleGroupItemElement, GhostToggleGroupItemExposed }
