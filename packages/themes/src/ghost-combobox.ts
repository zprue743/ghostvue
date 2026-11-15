import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCombobox as GhostUnstyledCombobox,
  type GhostComboboxExposed,
  type GhostComboboxValue,
} from '@ghostvue/vue'

/** Themed {@link GhostCombobox} root wrapper. */
export const GhostCombobox = defineComponent({
  name: 'GhostCombobox',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Array] as PropType<GhostComboboxValue>,
      default: undefined,
    },
    defaultValue: {
      type: [String, Array] as PropType<GhostComboboxValue>,
      default: undefined,
    },
    multiple: { type: Boolean, default: false },
    virtualized: { type: Boolean, default: false },
    search: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    defaultSearch: { type: String, default: '' },
    name: { type: String as PropType<string | undefined>, default: undefined },
    form: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    allowDeselect: { type: Boolean, default: false },
    open: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultOpen: { type: Boolean, default: false },
    placeholder: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  emits: {
    'update:modelValue': (value: GhostComboboxValue) =>
      value === undefined || typeof value === 'string' || Array.isArray(value),
    'update:search': (query: string) => typeof query === 'string',
    'update:open': (open: boolean) => typeof open === 'boolean',
    search: (payload: { query: string; requestId: number }) =>
      typeof payload.query === 'string' &&
      typeof payload.requestId === 'number',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostComboboxExposed | null>(null)

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
    } satisfies GhostComboboxExposed)

    return () =>
      h(
        GhostUnstyledCombobox,
        {
          ...attrs,
          ref: inner,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          multiple: props.multiple,
          virtualized: props.virtualized,
          search: props.search,
          defaultSearch: props.defaultSearch,
          name: props.name,
          form: props.form,
          disabled: props.disabled,
          required: props.required,
          invalid: props.invalid,
          loading: props.loading,
          allowDeselect: props.allowDeselect,
          open: props.open,
          defaultOpen: props.defaultOpen,
          placeholder: props.placeholder,
          'onUpdate:modelValue': (next: GhostComboboxValue) => {
            emit('update:modelValue', next)
          },
          'onUpdate:search': (next: string) => {
            emit('update:search', next)
          },
          'onUpdate:open': (next: boolean) => {
            emit('update:open', next)
          },
          onSearch: (payload: { query: string; requestId: number }) => {
            emit('search', payload)
          },
        },
        slots,
      )
  },
})

export type { GhostComboboxExposed }
