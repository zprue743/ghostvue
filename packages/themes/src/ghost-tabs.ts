import { defineComponent, h, type PropType } from 'vue'

import {
  GhostTabs as GhostUnstyledTabs,
  type GhostTabsActivationMode,
  type GhostTabsOrientation,
  type GhostTabsSlotProps,
} from '@ghostvue/vue'

/** Themed {@link GhostTabs} root wrapper. */
export const GhostTabs = defineComponent({
  name: 'GhostTabs',
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
    activationMode: {
      type: String as PropType<GhostTabsActivationMode>,
      default: 'automatic',
    },
    orientation: {
      type: String as PropType<GhostTabsOrientation>,
      default: 'horizontal',
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl'>,
      default: undefined,
    },
  },
  emits: {
    'update:modelValue': (value: string) => typeof value === 'string',
  },
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        GhostUnstyledTabs,
        {
          ...attrs,
          modelValue: props.modelValue,
          defaultValue: props.defaultValue,
          activationMode: props.activationMode,
          orientation: props.orientation,
          dir: props.dir,
          'onUpdate:modelValue': (value: string) => {
            emit('update:modelValue', value)
          },
        },
        slots,
      )
  },
})

export type { GhostTabsSlotProps }
