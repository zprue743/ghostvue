import { defineComponent, h, type PropType } from 'vue'

import {
  GhostKbd as GhostUnstyledKbd,
  type GhostKbdPlatform,
} from '@ghostvue/vue'

/** Visual size. Omitting it selects `md`. */
export type GhostKbdSize = 'sm' | 'md' | 'lg'

export type { GhostKbdPlatform }

/**
 * Themed wrapper: size as `data-size`, instance-scoped CSS. Behavior stays on
 * the unstyled primitive; native attrs fall through.
 */
export const GhostKbd = defineComponent({
  name: 'GhostKbd',
  inheritAttrs: false,
  props: {
    keys: {
      type: [String, Array] as PropType<string | readonly string[]>,
      default: undefined,
    },
    platform: {
      type: String as PropType<GhostKbdPlatform>,
      default: 'auto',
    },
    size: { type: String as PropType<GhostKbdSize>, default: 'md' },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledKbd,
          {
            ...attrs,
            keys: props.keys ?? [],
            platform: props.platform,
            // CSS treats a missing attribute as the default (md).
            'data-size': props.size === 'md' ? undefined : props.size,
          },
          slots,
        ),
      ])
  },
})
