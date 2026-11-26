import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostScrollSpyLink as GhostUnstyledScrollSpyLink,
  type GhostScrollSpyLinkExposed,
} from '@ghostvue/vue'
import type { GhostLinkElement } from '@ghostvue/vue'

/** Themed {@link GhostScrollSpyLink} wrapper. */
export const GhostScrollSpyLink = defineComponent({
  name: 'GhostScrollSpyLink',
  inheritAttrs: false,
  props: {
    target: { type: String, required: true },
    href: { type: String, default: '' },
    as: {
      type: [String, Object] as PropType<GhostLinkElement>,
      default: 'a',
    },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostScrollSpyLinkExposed | null>(null)
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
    } satisfies GhostScrollSpyLinkExposed)
    return () =>
      h(
        GhostUnstyledScrollSpyLink,
        {
          ...attrs,
          ref: inner,
          target: props.target,
          href: props.href,
          as: props.as,
          disabled: props.disabled,
          'data-themed': '',
        },
        slots,
      )
  },
})
