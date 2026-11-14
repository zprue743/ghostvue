import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostSegmentedControl as GhostUnstyledSegmentedControl,
  type GhostSegmentedControlElement,
  type GhostSegmentedControlExposed,
  type GhostSegmentedControlOrientation,
  type GhostSegmentedControlValue,
} from '@ghostvue/vue'

/** Themed {@link GhostSegmentedControl} wrapper. */
export const GhostSegmentedControl = defineComponent({
  name: 'GhostSegmentedControl',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String as PropType<GhostSegmentedControlValue>,
      default: undefined,
    },
    defaultValue: {
      type: String as PropType<GhostSegmentedControlValue>,
      default: undefined,
    },
    orientation: {
      type: String as PropType<GhostSegmentedControlOrientation>,
      default: 'horizontal',
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl'>,
      default: undefined,
    },
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostSegmentedControlElement>,
      default: 'div',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    deselectable: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:modelValue': (value: GhostSegmentedControlValue) =>
      value === undefined || typeof value === 'string',
  },
  setup(props, { attrs, emit, slots, expose }) {
    const inner = ref<GhostSegmentedControlExposed | null>(null)

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
    } satisfies GhostSegmentedControlExposed)

    return () =>
      h(
        GhostUnstyledSegmentedControl,
        {
          ...attrs,
          ref: inner,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          orientation: props.orientation,
          dir: props.dir,
          as: props.as,
          disabled: props.disabled,
          deselectable: props.deselectable,
          'data-themed': '',
          'onUpdate:modelValue': (value: GhostSegmentedControlValue) => {
            emit('update:modelValue', value)
          },
        },
        slots,
      )
  },
})

export type { GhostSegmentedControlExposed }
