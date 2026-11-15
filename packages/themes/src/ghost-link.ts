import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostLink as GhostUnstyledLink,
  type GhostLinkElement,
  type GhostLinkExposed,
} from '@ghostvue/vue'

/** Text decoration treatment. Omitting it selects `inline`. */
export type GhostLinkVariant = 'inline' | 'subtle'

/** Semantic color intent. Omitting it selects `accent`. */
export type GhostLinkTone = 'accent' | 'neutral'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostLink = defineComponent({
  name: 'GhostLink',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object] as PropType<GhostLinkElement>, default: 'a' },
    disabled: { type: Boolean, default: false },
    external: { type: Boolean, default: false },
    newTabLabel: { type: String, default: 'Opens in new tab' },
    variant: { type: String as PropType<GhostLinkVariant>, default: 'inline' },
    tone: { type: String as PropType<GhostLinkTone>, default: 'accent' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostLinkExposed | null>(null)

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
    } satisfies GhostLinkExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledLink,
          {
            ...attrs,
            ref: inner,
            as: props.as,
            disabled: props.disabled,
            external: props.external,
            newTabLabel: props.newTabLabel,
            'data-variant':
              props.variant === 'inline' ? undefined : props.variant,
            'data-tone': props.tone === 'accent' ? undefined : props.tone,
          },
          slots,
        ),
      ])
  },
})

export type { GhostLinkExposed }
