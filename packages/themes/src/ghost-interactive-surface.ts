import { defineComponent, h, ref, type PropType } from 'vue'

import {
  SlInteractiveSurface as SlUnstyledInteractiveSurface,
  type InteractiveEffect,
  type InteractiveSurfaceElement,
  type SlInteractiveSurfaceExposed,
} from '@slop-ui/vue'

/**
 * Themed wrapper: instance-scoped CSS. Behavior stays on the unstyled
 * primitive; native attrs fall through.
 */
export const SlInteractiveSurface = defineComponent({
  name: 'SlInteractiveSurface',
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
    const inner = ref<SlInteractiveSurfaceExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies SlInteractiveSurfaceExposed)

    return () =>
      h('span', { class: 'slop-themed-scope' }, [
        h(
          SlUnstyledInteractiveSurface,
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
  SlInteractiveSurfaceExposed,
}
