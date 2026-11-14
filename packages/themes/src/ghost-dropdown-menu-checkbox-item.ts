import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDropdownMenuCheckboxItem as GhostUnstyledDropdownMenuCheckboxItem,
  type GhostDropdownMenuCheckboxItemElement,
  type GhostDropdownMenuCheckboxItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuCheckboxItem} wrapper. */
export const GhostDropdownMenuCheckboxItem = defineComponent({
  name: 'GhostDropdownMenuCheckboxItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostDropdownMenuCheckboxItemElement>,
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
    const inner = ref<GhostDropdownMenuCheckboxItemExposed | null>(null)

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
    } satisfies GhostDropdownMenuCheckboxItemExposed)

    return () =>
      h(
        GhostUnstyledDropdownMenuCheckboxItem,
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
  GhostDropdownMenuCheckboxItemElement,
  GhostDropdownMenuCheckboxItemExposed,
}
