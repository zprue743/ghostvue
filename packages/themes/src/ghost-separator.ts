import { defineComponent, h, type PropType } from 'vue'

import {
  GhostSeparator as GhostUnstyledSeparator,
  type GhostSeparatorElement,
  type GhostSeparatorOrientation,
} from '@ghostvue/vue'

/**
 * Themed wrapper: instance-scoped CSS. Behavior stays on the unstyled
 * primitive; native attrs fall through. `as` has no static default — the
 * headless component picks `hr` or `div` from orientation.
 */
export const GhostSeparator = defineComponent({
  name: 'GhostSeparator',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostSeparatorElement>,
      default: undefined,
    },
    decorative: { type: Boolean, default: false },
    orientation: {
      type: String as PropType<GhostSeparatorOrientation>,
      default: 'horizontal',
    },
  },
  setup(props, { attrs }) {
    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledSeparator, {
          ...attrs,
          // Omit `as` when unset so exactOptionalPropertyTypes stays satisfied
          // and the unstyled default (hr vs div) still applies.
          ...(props.as ? { as: props.as } : {}),
          decorative: props.decorative,
          orientation: props.orientation,
        }),
      ])
  },
})

export type { GhostSeparatorElement, GhostSeparatorOrientation }
