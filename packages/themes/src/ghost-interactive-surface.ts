import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostInteractiveSurface as GhostUnstyledInteractiveSurface,
  type InteractiveEffect,
  type InteractiveSurfaceElement,
  type GhostInteractiveSurfaceExposed,
} from '@ghostvue/vue'

/**
 * Themed wrapper: instance-scoped CSS. Behavior stays on the unstyled
 * primitive; native attrs fall through.
 */
export const GhostInteractiveSurface = defineComponent({
  name: 'GhostInteractiveSurface',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<InteractiveSurfaceElement>,
      default: 'div',
    },
    effects: {
      type: Array as PropType<InteractiveEffect[]>,
      default: () => ['spotlight'],
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostInteractiveSurfaceExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostInteractiveSurfaceExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledInteractiveSurface,
          {
            ...attrs,
            ref: inner,
            as: props.as,
            effects: props.effects,
          },
          slots,
        ),
      ])
  },
})

export type {
  InteractiveEffect,
  InteractiveSurfaceElement,
  GhostInteractiveSurfaceExposed,
}
