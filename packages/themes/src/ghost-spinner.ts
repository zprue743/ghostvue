import { defineComponent, h, type PropType } from 'vue'

import { GhostSpinner as GhostUnstyledSpinner } from '@ghostvue/vue'

/** Semantic color intent. Omitting it selects `accent`. */
export type GhostSpinnerTone = 'accent' | 'neutral' | 'danger'

/** Visual size. Omitting it selects `md`. */
export type GhostSpinnerSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostSpinner = defineComponent({
  name: 'GhostSpinner',
  inheritAttrs: false,
  props: {
    label: { type: String, default: 'Loading' },
    tone: { type: String as PropType<GhostSpinnerTone>, default: 'accent' },
    size: { type: String as PropType<GhostSpinnerSize>, default: 'md' },
  },
  setup(props, { attrs }) {
    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledSpinner, {
          ...attrs,
          label: props.label,
          // CSS treats missing attributes as the defaults (accent / md).
          'data-tone': props.tone === 'accent' ? undefined : props.tone,
          'data-size': props.size === 'md' ? undefined : props.size,
        }),
      ])
  },
})
