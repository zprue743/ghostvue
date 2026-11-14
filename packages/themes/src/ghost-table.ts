import { defineComponent, h, ref } from 'vue'

import {
  GhostTable as GhostUnstyledTable,
  type GhostTableExposed,
} from '@ghostvue/vue'

/**
 * Themed {@link GhostTable} root. Sub-parts stay unstyled; recipes target
 * `data-part` under `.ghost-themed-scope`.
 */
export const GhostTable = defineComponent({
  name: 'GhostTable',
  inheritAttrs: false,
  props: {
    containHorizontal: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostTableExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostTableExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledTable,
          {
            ...attrs,
            containHorizontal: props.containHorizontal,
            ref: inner,
          },
          slots,
        ),
      ])
  },
})

export type { GhostTableExposed }
