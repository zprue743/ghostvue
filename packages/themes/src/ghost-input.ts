import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostInput as GhostUnstyledInput,
  type GhostInputExposed,
  type GhostInputType,
} from '@ghostvue/vue'

/** Visual size. Omitting it selects `md`. */
export type GhostInputSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostInput = defineComponent({
  name: 'GhostInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    type: { type: String as PropType<GhostInputType>, default: 'text' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    size: { type: String as PropType<GhostInputSize>, default: 'md' },
    block: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
  },
  setup(props, { attrs, emit, expose }) {
    const inner = ref<GhostInputExposed | null>(null)

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
    } satisfies GhostInputExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledInput, {
          ...attrs,
          ref: inner,
          // Omit modelValue when unset so uncontrolled mode stays intact.
          ...(props.modelValue !== undefined
            ? { modelValue: props.modelValue }
            : {}),
          defaultValue: props.defaultValue,
          type: props.type,
          disabled: props.disabled,
          readonly: props.readonly,
          invalid: props.invalid,
          required: props.required,
          'onUpdate:modelValue': (value: string) => {
            emit('update:modelValue', value)
          },
          // CSS treats missing attributes as the defaults (md).
          'data-size': props.size === 'md' ? undefined : props.size,
          'data-block': props.block ? '' : undefined,
        }),
      ])
  },
})

export type { GhostInputExposed, GhostInputType }
