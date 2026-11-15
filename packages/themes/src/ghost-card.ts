import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostCard as GhostUnstyledCard,
  type GhostCardExposed,
  type GhostCardElement,
  type InteractiveEffect,
} from '@ghostvue/vue'

/** Opt-in pointer spotlight on a card. */
export type GhostCardInteractive = 'spotlight'

/**
 * Themed wrapper: `data-themed` for recipes without an extra layout wrapper.
 * Behavior and part order stay on the unstyled primitive.
 */
export const GhostCard = defineComponent({
  name: 'GhostCard',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostCardElement>,
      default: 'article',
    },
    interactive: {
      type: String as PropType<GhostCardInteractive>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostCardExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostCardExposed)

    const effects = (): InteractiveEffect[] =>
      props.interactive === 'spotlight' ? ['spotlight'] : []

    return () =>
      h(
        GhostUnstyledCard,
        {
          ...attrs,
          ref: inner,
          as: props.as,
          effects: effects(),
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostCardExposed, GhostCardElement }
