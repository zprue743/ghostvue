import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostTreeGroup as GhostUnstyledTreeGroup,
  type GhostTreeGroupElement,
  type GhostTreeGroupExposed,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTreeGroup} wrapper. `data-themed` opts the group into the
 * deferred-`hidden` close transition; the component name stays
 * `GhostTreeGroup` so the item's server-render slot scan recognizes it.
 */
export const GhostTreeGroup = defineComponent({
  name: 'GhostTreeGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostTreeGroupElement>,
      default: 'ul',
    },
    disableAnimation: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTreeGroupExposed | null>(null)

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
    } satisfies GhostTreeGroupExposed)

    return () =>
      h(
        GhostUnstyledTreeGroup,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          disableAnimation: props.disableAnimation,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostTreeGroupElement, GhostTreeGroupExposed }
