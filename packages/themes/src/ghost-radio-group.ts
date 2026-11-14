import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostRadioGroup as GhostUnstyledRadioGroup,
  GhostRadioGroupItem as GhostUnstyledRadioGroupItem,
  type GhostRadioGroupExposed,
  type GhostRadioGroupItemExposed,
  type GhostRadioGroupOrientation,
} from '@ghostvue/vue'

/** Visual density for radio stacks. */
export type GhostRadioGroupSize = 'sm' | 'md' | 'lg'

/**
 * Themed radio group: layout tokens only. Behavior stays on unstyled parts.
 */
export const GhostRadioGroup = defineComponent({
  name: 'GhostRadioGroup',
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
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    orientation: {
      type: String as PropType<GhostRadioGroupOrientation>,
      default: 'vertical',
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl' | undefined>,
      default: undefined,
    },
    size: { type: String as PropType<GhostRadioGroupSize>, default: 'md' },
  },
  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inner = ref<GhostRadioGroupExposed | null>(null)

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
    } satisfies GhostRadioGroupExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledRadioGroup,
          {
            ...attrs,
            ref: inner,
            ...(props.modelValue !== undefined
              ? { modelValue: props.modelValue }
              : {}),
            defaultValue: props.defaultValue,
            name: props.name,
            disabled: props.disabled,
            required: props.required,
            invalid: props.invalid,
            orientation: props.orientation,
            dir: props.dir,
            'data-size': props.size === 'md' ? undefined : props.size,
            'onUpdate:modelValue': (value: string) => {
              emit('update:modelValue', value)
            },
          },
          slots,
        ),
      ])
  },
})

export const GhostRadioGroupItem = defineComponent({
  name: 'GhostRadioGroupItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    size: { type: String as PropType<GhostRadioGroupSize>, default: 'md' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostRadioGroupItemExposed | null>(null)

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
    } satisfies GhostRadioGroupItemExposed)

    return () =>
      h(
        GhostUnstyledRadioGroupItem,
        {
          ...attrs,
          ref: inner,
          value: props.value,
          disabled: props.disabled,
          'data-size': props.size === 'md' ? undefined : props.size,
        },
        slots,
      )
  },
})

export type { GhostRadioGroupExposed, GhostRadioGroupItemExposed }
