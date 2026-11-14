import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCollapsibleContent as GhostUnstyledCollapsibleContent,
  type GhostCollapsibleContentElement,
  type GhostCollapsibleContentExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostCollapsibleContent} wrapper. */
export const GhostCollapsibleContent = defineComponent({
  name: 'GhostCollapsibleContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostCollapsibleContentElement>,
      default: 'div',
    },
    disableAnimation: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostCollapsibleContentExposed | null>(null)

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
    } satisfies GhostCollapsibleContentExposed)

    return () =>
      h(
        GhostUnstyledCollapsibleContent,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disableAnimation: props.disableAnimation,
        },
        slots,
      )
  },
})

export type { GhostCollapsibleContentElement, GhostCollapsibleContentExposed }
