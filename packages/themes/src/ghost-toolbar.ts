import { defineComponent, h, ref } from 'vue'

import {
  GhostToolbar as GhostUnstyledToolbar,
  type GhostToolbarExposed,
} from '@ghostvue/vue'

/** Themed wrapper: layout via instance-scoped CSS. Behavior stays unstyled. */
export const GhostToolbar = defineComponent({
  name: 'GhostToolbar',
  inheritAttrs: false,
  setup(_props, { attrs, slots, expose }) {
    const inner = ref<GhostToolbarExposed | null>(null)

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
    } satisfies GhostToolbarExposed)

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledToolbar, { ...attrs, ref: inner }, slots),
      ])
  },
})

export type { GhostToolbarExposed }
