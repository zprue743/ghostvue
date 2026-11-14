import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSwitch as GhostUnstyledSwitch,
  type GhostSwitchExposed,
} from '@ghostvue/vue'

/** Visual size. Omitting it selects `md`. */
export type GhostSwitchSize = 'sm' | 'md' | 'lg'

/** Semantic color of the on track. Omitting it selects `accent`. */
export type GhostSwitchTone = 'accent' | 'neutral' | 'danger'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostSwitch = defineComponent({
  name: 'GhostSwitch',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    defaultValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    value: { type: String, default: 'on' },
    form: { type: String, default: undefined },
    size: { type: String as PropType<GhostSwitchSize>, default: 'md' },
    tone: { type: String as PropType<GhostSwitchTone>, default: 'accent' },
  },
  emits: {
    'update:modelValue': (checked: boolean) => typeof checked === 'boolean',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostSwitchExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
      get checked() {
        return inner.value?.checked ?? false
      },
      toggle() {
        inner.value?.toggle()
      },
      focus(options?: FocusOptions) {
        inner.value?.focus(options)
      },
      blur() {
        inner.value?.blur()
      },
    } satisfies GhostSwitchExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledSwitch,
          {
            ...attrs,
            ref: inner,
            ...(props.modelValue === undefined
              ? {}
              : { modelValue: props.modelValue }),
            defaultValue: props.defaultValue,
            disabled: props.disabled,
            readonly: props.readonly,
            ...(props.name ? { name: props.name } : {}),
            value: props.value,
            ...(props.form ? { form: props.form } : {}),
            // CSS treats missing attributes as the defaults (md / accent).
            'data-size': props.size === 'md' ? undefined : props.size,
            'data-tone': props.tone === 'accent' ? undefined : props.tone,
            'onUpdate:modelValue': (next: boolean) => {
              emit('update:modelValue', next)
            },
          },
          slots,
        ),
      ])
  },
})

export type { GhostSwitchExposed }
