import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostMenubar as GhostUnstyledMenubar,
  type GhostMenubarExposed,
  type GhostMenubarProps,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubar} root wrapper. */
export const GhostMenubar = defineComponent({
  name: 'GhostMenubar',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<
        NonNullable<GhostMenubarProps['as']>
      >,
      default: 'div',
    },
    dir: {
      type: String as PropType<GhostMenubarProps['dir']>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostMenubarExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostMenubarExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledMenubar,
          {
            ...attrs,
            ref: inner,
            as: props.as,
            dir: props.dir,
          },
          slots,
        ),
      ])
  },
})

export type { GhostMenubarExposed, GhostMenubarProps }
