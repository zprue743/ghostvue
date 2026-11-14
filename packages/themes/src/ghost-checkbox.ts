import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCheckbox as GhostUnstyledCheckbox,
  type GhostCheckboxExposed,
} from '@ghostvue/vue'

/** Visual size. Omitting it selects `md`. */
export type GhostCheckboxSize = 'sm' | 'md' | 'lg'

/** Semantic color intent. Omitting it selects `accent`. */
export type GhostCheckboxTone = 'accent' | 'neutral' | 'danger'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through. `modelValue` is omitted
 * when unset so the unstyled control stays uncontrolled.
 */
export const GhostCheckbox = defineComponent({
  name: 'GhostCheckbox',
  inheritAttrs: false,
  props: {
    // Same Boolean-coercion trap as the unstyled SFC: omitted must stay
    // undefined so the inner control can be uncontrolled.
    modelValue: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultValue: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    size: { type: String as PropType<GhostCheckboxSize>, default: 'md' },
    tone: { type: String as PropType<GhostCheckboxTone>, default: 'accent' },
  },
  emits: {
    'update:modelValue': (value: boolean) => typeof value === 'boolean',
  },
  setup(props, { attrs, emit, expose }) {
    const inner = ref<GhostCheckboxExposed | null>(null)

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
    } satisfies GhostCheckboxExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledCheckbox, {
          ...attrs,
          ref: inner,
          ...(props.modelValue !== undefined
            ? { modelValue: props.modelValue }
            : {}),
          defaultValue: props.defaultValue,
          indeterminate: props.indeterminate,
          disabled: props.disabled,
          // CSS treats missing attributes as the defaults (md / accent).
          'data-size': props.size === 'md' ? undefined : props.size,
          'data-tone': props.tone === 'accent' ? undefined : props.tone,
          'onUpdate:modelValue': (value: boolean) => {
            emit('update:modelValue', value)
          },
        }),
      ])
  },
})

export type { GhostCheckboxExposed }
