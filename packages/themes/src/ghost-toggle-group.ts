import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostToggleGroup as GhostUnstyledToggleGroup,
  type GhostToggleGroupElement,
  type GhostToggleGroupExposed,
  type GhostToggleGroupOrientation,
  type GhostToggleGroupType,
  type GhostToggleGroupValue,
} from '@ghostvue/vue'

/** Themed {@link GhostToggleGroup} wrapper. */
export const GhostToggleGroup = defineComponent({
  name: 'GhostToggleGroup',
  inheritAttrs: false,
  props: {
    type: {
      type: String as PropType<GhostToggleGroupType>,
      default: 'single',
    },
    modelValue: {
      type: [String, Array] as PropType<GhostToggleGroupValue>,
      default: undefined,
    },
    defaultValue: {
      type: [String, Array] as PropType<GhostToggleGroupValue>,
      default: undefined,
    },
    orientation: {
      type: String as PropType<GhostToggleGroupOrientation>,
      default: 'horizontal',
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl'>,
      default: undefined,
    },
    as: {
      type: [String, Object, Function] as PropType<GhostToggleGroupElement>,
      default: 'div',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:modelValue': (value: GhostToggleGroupValue) =>
      value === undefined || typeof value === 'string' || Array.isArray(value),
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostToggleGroupExposed | null>(null)

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
    } satisfies GhostToggleGroupExposed)

    return () =>
      h(
        GhostUnstyledToggleGroup,
        {
          ...attrs,
          ref: inner,
          type: props.type,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          orientation: props.orientation,
          dir: props.dir,
          as: props.as,
          disabled: props.disabled,
          'data-themed': '',
          'onUpdate:modelValue': (value: GhostToggleGroupValue) => {
            emit('update:modelValue', value)
          },
        },
        slots,
      )
  },
})

export type { GhostToggleGroupExposed }
