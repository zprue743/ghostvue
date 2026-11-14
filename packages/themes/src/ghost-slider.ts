import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSlider as GhostUnstyledSlider,
  type GhostSliderExposed,
  type GhostSliderValue,
} from '@ghostvue/vue'

export type GhostSliderSize = 'sm' | 'md' | 'lg'
export type GhostSliderTone = 'accent' | 'neutral' | 'danger'

export const GhostSlider = defineComponent({
  name: 'GhostSlider',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Number, Array] as PropType<GhostSliderValue | undefined>,
      default: undefined,
    },
    defaultValue: {
      type: [Number, Array] as PropType<GhostSliderValue | undefined>,
      default: undefined,
    },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    range: { type: Boolean, default: false },
    orientation: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    disabled: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    nameMax: { type: String, default: undefined },
    form: { type: String, default: undefined },
    valueText: { type: String, default: undefined },
    size: { type: String as PropType<GhostSliderSize>, default: 'md' },
    tone: { type: String as PropType<GhostSliderTone>, default: 'accent' },
  },
  emits: {
    'update:modelValue': (value: GhostSliderValue) =>
      typeof value === 'number' || Array.isArray(value),
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostSliderExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      get value() {
        return inner.value?.value ?? props.min
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostSliderExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledSlider,
          {
            ...attrs,
            ref: inner,
            ...(props.modelValue === undefined
              ? {}
              : { modelValue: props.modelValue }),
            ...(props.defaultValue === undefined
              ? {}
              : { defaultValue: props.defaultValue }),
            min: props.min,
            max: props.max,
            step: props.step,
            range: props.range,
            orientation: props.orientation,
            disabled: props.disabled,
            ...(props.name ? { name: props.name } : {}),
            ...(props.nameMax ? { nameMax: props.nameMax } : {}),
            ...(props.form ? { form: props.form } : {}),
            ...(props.valueText ? { valueText: props.valueText } : {}),
            'data-size': props.size === 'md' ? undefined : props.size,
            'data-tone': props.tone === 'accent' ? undefined : props.tone,
            'onUpdate:modelValue': (next: GhostSliderValue) => {
              emit('update:modelValue', next)
            },
          },
          slots,
        ),
      ])
  },
})

export type { GhostSliderExposed }
