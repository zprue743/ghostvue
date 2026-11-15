import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostContextMenuCheckboxItem as GhostUnstyledContextMenuCheckboxItem,
  type GhostContextMenuCheckboxItemElement,
  type GhostContextMenuCheckboxItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuCheckboxItem} wrapper. */
export const GhostContextMenuCheckboxItem = defineComponent({
  name: 'GhostContextMenuCheckboxItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuCheckboxItemElement>,
      default: 'div',
    },
    checked: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultChecked: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:checked': (checked: boolean) => typeof checked === 'boolean',
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inner = ref<GhostContextMenuCheckboxItemExposed | null>(null)

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
    } satisfies GhostContextMenuCheckboxItemExposed)

    return () =>
      h(
        GhostUnstyledContextMenuCheckboxItem,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          checked: props.checked,
          defaultChecked: props.defaultChecked,
          disabled: props.disabled,
          'onUpdate:checked': (next: boolean) => {
            emit('update:checked', next)
          },
        },
        slots,
      )
  },
})

export type {
  GhostContextMenuCheckboxItemElement,
  GhostContextMenuCheckboxItemExposed,
}
