import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostNumberInput as GhostUnstyledNumberInput,
  type GhostNumberInputExposed,
  type GhostNumberInputFormatOptions,
} from '@ghostvue/vue'

import type { GhostInputSize } from './ghost-input'

/**
 * Themed numeric spinbutton: visual `data-*` on the root, behavior on the
 * unstyled primitive.
 */
export const GhostNumberInput = defineComponent({
  name: 'GhostNumberInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Number as PropType<number | null | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: Number as PropType<number | null>,
      default: null,
    },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    step: { type: Number, default: 1 },
    locale: { type: String, default: undefined },
    formatOptions: {
      type: Object as PropType<GhostNumberInputFormatOptions>,
      default: undefined,
    },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    decrementLabel: { type: String, default: 'Decrease' },
    incrementLabel: { type: String, default: 'Increase' },
    size: { type: String as PropType<GhostInputSize>, default: 'md' },
    block: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (value: number | null) =>
      value === null || typeof value === 'number',
  },
  setup(props, { attrs, emit, expose }) {
    const inner = ref<GhostNumberInputExposed | null>(null)

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
      increment() {
        inner.value?.increment()
      },
      decrement() {
        inner.value?.decrement()
      },
    } satisfies GhostNumberInputExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledNumberInput, {
          ...attrs,
          ref: inner,
          ...(props.modelValue !== undefined
            ? { modelValue: props.modelValue }
            : {}),
          defaultValue: props.defaultValue,
          ...(props.min === undefined ? {} : { min: props.min }),
          ...(props.max === undefined ? {} : { max: props.max }),
          step: props.step,
          ...(props.locale === undefined ? {} : { locale: props.locale }),
          ...(props.formatOptions === undefined
            ? {}
            : { formatOptions: props.formatOptions }),
          disabled: props.disabled,
          readonly: props.readonly,
          invalid: props.invalid,
          required: props.required,
          decrementLabel: props.decrementLabel,
          incrementLabel: props.incrementLabel,
          'onUpdate:modelValue': (value: number | null) => {
            emit('update:modelValue', value)
          },
          'data-size': props.size === 'md' ? undefined : props.size,
          'data-block': props.block ? '' : undefined,
        }),
      ])
  },
})

export type { GhostNumberInputExposed, GhostNumberInputFormatOptions }
