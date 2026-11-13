import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostDialogTitle as GhostUnstyledDialogTitle,
  type GhostDialogTitleElement,
  type GhostDialogTitleExposed,
} from '@ghostvue/vue'

/** Themed {@link GhostDialogTitle} wrapper. */
export const GhostDialogTitle = defineComponent({
  name: 'GhostDialogTitle',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDialogTitleElement>,
      default: 'h2',
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostDialogTitleExposed | null>(null)

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
    } satisfies GhostDialogTitleExposed)

    return () =>
      h(
        GhostUnstyledDialogTitle,
        {
          ...attrs,
          ref: inner,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDialogTitleElement, GhostDialogTitleExposed }
