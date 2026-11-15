import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostMenubarCheckboxItem as GhostUnstyledMenubarCheckboxItem,
  type GhostMenubarCheckboxItemElement,
  type GhostMenubarCheckboxItemExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarCheckboxItem} wrapper. */
export const GhostMenubarCheckboxItem = defineComponent({
  name: 'GhostMenubarCheckboxItem',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostMenubarCheckboxItemElement>,
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
    const inner = ref<GhostMenubarCheckboxItemExposed | null>(null)

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
    } satisfies GhostMenubarCheckboxItemExposed)

    return () =>
      h(
        GhostUnstyledMenubarCheckboxItem,
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

export type { GhostMenubarCheckboxItemElement, GhostMenubarCheckboxItemExposed }
