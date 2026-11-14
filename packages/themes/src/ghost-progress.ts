import { defineComponent, h, type PropType } from 'vue'

import { GhostProgress as GhostUnstyledProgress } from '@ghostvue/vue'

/** Semantic color intent. Omitting it selects `accent`. */
export type GhostProgressTone = 'accent' | 'neutral' | 'danger'

/** Track thickness. Omitting it selects `md`. */
export type GhostProgressSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostProgress = defineComponent({
  name: 'GhostProgress',
  inheritAttrs: false,
  props: {
    value: {
      type: Number as PropType<number | null>,
      default: undefined,
    },
    max: { type: Number, default: 100 },
    label: { type: String, default: undefined },
    valueText: { type: String, default: undefined },
    tone: { type: String as PropType<GhostProgressTone>, default: 'accent' },
    size: { type: String as PropType<GhostProgressSize>, default: 'md' },
  },
  setup(props, { attrs }) {
    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledProgress, {
          ...attrs,
          // Omit unset optionals so exactOptionalPropertyTypes stays satisfied
          // and `null` still reaches the unstyled indeterminate fallback.
          ...(props.value === undefined ? {} : { value: props.value }),
          max: props.max,
          ...(props.label ? { label: props.label } : {}),
          ...(props.valueText ? { valueText: props.valueText } : {}),
          // CSS treats missing attributes as the defaults (accent / md).
          'data-tone': props.tone === 'accent' ? undefined : props.tone,
          'data-size': props.size === 'md' ? undefined : props.size,
        }),
      ])
  },
})
