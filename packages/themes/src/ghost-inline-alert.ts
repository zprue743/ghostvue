import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostInlineAlert as GhostUnstyledInlineAlert,
  type GhostInlineAlertAnnounce,
  type GhostInlineAlertExposed,
  type GhostInlineAlertHeadingLevel,
  type GhostInlineAlertElement,
} from '@ghostvue/vue'

/** Visual treatment for the themed inline alert. Omitting it selects `soft`. */
export type GhostInlineAlertVariant = 'solid' | 'soft' | 'outline' | 'ghost'

/** Semantic color intent, independent of {@link GhostInlineAlertVariant}. */
export type GhostInlineAlertTone = 'accent' | 'neutral' | 'danger'

/**
 * Themed wrapper: visual props as `data-*`, `data-themed` on the inner root.
 * Behavior and live-region semantics stay on the unstyled primitive.
 */
export const GhostInlineAlert = defineComponent({
  name: 'GhostInlineAlert',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostInlineAlertElement>,
      default: 'div',
    },
    headingLevel: {
      type: Number as PropType<GhostInlineAlertHeadingLevel>,
      default: 3,
    },
    announce: {
      type: String as PropType<GhostInlineAlertAnnounce>,
      default: 'off',
    },
    variant: {
      type: String as PropType<GhostInlineAlertVariant>,
      default: 'soft',
    },
    tone: {
      type: String as PropType<GhostInlineAlertTone>,
      default: 'neutral',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostInlineAlertExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostInlineAlertExposed)

    return () =>
      h(
        GhostUnstyledInlineAlert,
        {
          ...attrs,
          as: props.as,
          headingLevel: props.headingLevel,
          announce: props.announce,
          ref: inner,
          'data-themed': '',
          'data-variant': props.variant === 'soft' ? undefined : props.variant,
          'data-tone': props.tone === 'neutral' ? undefined : props.tone,
        },
        slots,
      )
  },
})

export type { GhostInlineAlertExposed }
