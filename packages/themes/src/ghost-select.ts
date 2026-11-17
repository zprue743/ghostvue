import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSelect as GhostUnstyledSelect,
  type GhostSelectExposed,
  type GhostSelectMessages,
} from '@ghostvue/vue'

/** Themed {@link GhostSelect} root wrapper. */
export const GhostSelect = defineComponent({
  name: 'GhostSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    name: { type: String as PropType<string | undefined>, default: undefined },
    form: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    open: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultOpen: { type: Boolean, default: false },
    placeholder: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    messages: {
      type: Object as PropType<GhostSelectMessages | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:modelValue': (value: string | undefined) =>
      value === undefined || typeof value === 'string',
    'update:open': (open: boolean) => typeof open === 'boolean',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostSelectExposed | null>(null)

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
    } satisfies GhostSelectExposed)

    return () =>
      h(
        GhostUnstyledSelect,
        {
          ...attrs,
          ref: inner,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          name: props.name,
          form: props.form,
          disabled: props.disabled,
          required: props.required,
          invalid: props.invalid,
          open: props.open,
          defaultOpen: props.defaultOpen,
          placeholder: props.placeholder,
          messages: props.messages,
          'onUpdate:modelValue': (next: string | undefined) => {
            emit('update:modelValue', next)
          },
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
        },
        slots,
      )
  },
})

export type { GhostSelectExposed }
