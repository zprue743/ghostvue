import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostAccordionTrigger as GhostUnstyledAccordionTrigger,
  type GhostAccordionTriggerExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostAccordionTrigger} wrapper. */
export const GhostAccordionTrigger = defineComponent({
  name: 'GhostAccordionTrigger',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<string | object>,
      default: 'button',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostAccordionTriggerExposed | null>(null)

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
    } satisfies GhostAccordionTriggerExposed)

    return () =>
      h(
        GhostUnstyledAccordionTrigger,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          'data-themed': '',
        },
        slots,
      )
  },
})
