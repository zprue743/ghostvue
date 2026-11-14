import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostBadge as GhostUnstyledBadge,
  type GhostBadgeExposed,
} from '@ghostvue/vue'

/** Visual treatment for the themed badge. Omitting it selects `soft`. */
export type GhostBadgeVariant = 'solid' | 'soft' | 'outline' | 'ghost'

/** Semantic color intent, independent of {@link GhostBadgeVariant}. */
export type GhostBadgeTone = 'accent' | 'neutral' | 'danger'

/** Compact size. Omitting it selects `sm`. */
export type GhostBadgeSize = 'sm' | 'md'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostBadge = defineComponent({
  name: 'GhostBadge',
  inheritAttrs: false,
  props: {
    variant: { type: String as PropType<GhostBadgeVariant>, default: 'soft' },
    tone: { type: String as PropType<GhostBadgeTone>, default: 'neutral' },
    size: { type: String as PropType<GhostBadgeSize>, default: 'sm' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostBadgeExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostBadgeExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledBadge,
          {
            ...attrs,
            ref: inner,
            // CSS treats missing attributes as the defaults (soft / neutral / sm).
            'data-variant':
              props.variant === 'soft' ? undefined : props.variant,
            'data-tone': props.tone === 'neutral' ? undefined : props.tone,
            'data-size': props.size === 'sm' ? undefined : props.size,
          },
          slots,
        ),
      ])
  },
})

export type { GhostBadgeExposed }
