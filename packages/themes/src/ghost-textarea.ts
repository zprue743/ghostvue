import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTextarea as GhostUnstyledTextarea,
  type GhostTextareaExposed,
} from '@ghostvue/vue'

/** Visual size. Omitting it selects `md`. */
export type GhostTextareaSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: visual size as `data-size`, instance-scoped CSS. Behavior
 * stays on the unstyled primitive; native attrs fall through.
 */
export const GhostTextarea = defineComponent({
  name: 'GhostTextarea',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    defaultValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    rows: { type: Number, default: 2 },
    maxRows: { type: Number, default: undefined },
    autoResize: { type: Boolean, default: false },
    size: { type: String as PropType<GhostTextareaSize>, default: 'md' },
  },
  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
  },
  setup(props, { attrs, emit, expose }) {
    const inner = ref<GhostTextareaExposed | null>(null)

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
    } satisfies GhostTextareaExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledTextarea, {
          ...attrs,
          ref: inner,
          // Omit unset optionals so exactOptionalPropertyTypes stays satisfied
          // and uncontrolled v-model still applies.
          ...(props.modelValue === undefined
            ? {}
            : { modelValue: props.modelValue }),
          defaultValue: props.defaultValue,
          disabled: props.disabled,
          readonly: props.readonly,
          invalid: props.invalid,
          required: props.required,
          rows: props.rows,
          ...(props.maxRows === undefined ? {} : { maxRows: props.maxRows }),
          autoResize: props.autoResize,
          // CSS treats a missing hook as md.
          'data-size': props.size === 'md' ? undefined : props.size,
          'onUpdate:modelValue': (value: string) => {
            emit('update:modelValue', value)
          },
        }),
      ])
  },
})

export type { GhostTextareaExposed }
