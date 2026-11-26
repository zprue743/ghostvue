import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostLink as GhostUnstyledLink,
  type GhostLinkElement,
  type GhostLinkExposed,
} from '@ghostvue/vue'

import type {
  GhostButtonSize,
  GhostButtonTone,
  GhostButtonVariant,
} from './ghost-button'

/** Visual presentation mode. Omitting it selects `link`. */
export type GhostLinkAppearance = 'link' | 'button'

/** Visual treatment. Link appearance uses `inline` | `subtle`; button appearance uses `GhostButtonVariant`. */
export type GhostLinkVariant = 'inline' | 'subtle' | GhostButtonVariant

/** Semantic color intent. Link appearance uses `accent` | `neutral`; button appearance uses `GhostButtonTone`. */
export type GhostLinkTone = 'accent' | 'neutral' | GhostButtonTone

/** Control size when `appearance` is `'button'`. Omitting it selects `md`. */
export type GhostLinkSize = GhostButtonSize

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
    appearance: {
      type: String as PropType<GhostLinkAppearance>,
      default: 'link',
    },
    variant: {
      type: String as PropType<GhostLinkVariant>,
      default: undefined,
    },
    tone: { type: String as PropType<GhostLinkTone>, default: 'accent' },
    size: { type: String as PropType<GhostLinkSize>, default: 'md' },
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

    return () => {
      const isButton = props.appearance === 'button'
      const defaultVariant = isButton ? 'solid' : 'inline'
      const resolvedVariant = props.variant ?? defaultVariant

      return h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledLink,
          {
            ...attrs,
            ref: inner,
            as: props.as,
            disabled: props.disabled,
            external: props.external,
            newTabLabel: props.newTabLabel,
            'data-appearance': isButton ? 'button' : undefined,
            'data-variant':
              resolvedVariant === defaultVariant ? undefined : resolvedVariant,
            'data-tone': props.tone === 'accent' ? undefined : props.tone,
            'data-size':
              isButton && props.size !== 'md' ? props.size : undefined,
          },
          slots,
        ),
      ])
    }
  },
})

export type { GhostLinkExposed }
