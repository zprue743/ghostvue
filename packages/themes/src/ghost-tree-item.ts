import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTreeItem as GhostUnstyledTreeItem,
  type GhostTreeItemElement,
  type GhostTreeItemExposed,
  type GhostTreeItemSlotProps,
} from '@ghostvue/vue'

/** Themed {@link GhostTreeItem} wrapper. */
export const GhostTreeItem = defineComponent({
  name: 'GhostTreeItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTreeItemElement>,
      default: 'li',
    },
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    textValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTreeItemExposed | null>(null)

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
    } satisfies GhostTreeItemExposed)

    return () =>
      h(
        GhostUnstyledTreeItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          value: props.value,
          disabled: props.disabled,
          textValue: props.textValue,
          'data-themed': '',
        },
        slots as {
          default?: (slotProps: GhostTreeItemSlotProps) => unknown
        },
      )
  },
})

export type {
  GhostTreeItemElement,
  GhostTreeItemExposed,
  GhostTreeItemSlotProps,
}
