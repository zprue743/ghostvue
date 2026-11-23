import { computed, defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostToast as GhostUnstyledToast,
  type GhostToastExposed,
  type GhostToastRecord,
  type GhostToastSlotProps,
} from '@ghostvue/vue'

/** Visual treatment of a themed toast. Omitting it selects `surface`. */
export type GhostToastVariant = 'surface' | 'solid'

/**
 * Semantic color intent, independent of {@link GhostToastVariant}. When it is
 * not set, the record's `type` picks it: `'error'` maps to `danger`, anything
 * else to `neutral`.
 */
export type GhostToastTone = 'neutral' | 'accent' | 'danger'

/**
 * Themed {@link GhostToast} wrapper. Adds `data-themed` plus `data-variant` and
 * `data-tone` visual hooks (defaults omitted, as on `GhostInlineAlert`).
 * Timers, pause reasons, Escape, and focus return all stay on the unstyled
 * root, so the themed stack has no behavior of its own.
 *
 * Enter motion lives in `ghost-toast.css` as a CSS animation, which plays once
 * when the root element is inserted. The viewport keys each root by toast id,
 * so `update()` and duplicate-id merges patch the same element and the
 * animation does not replay (spec T7).
 */
export const GhostToast = defineComponent({
  name: 'GhostToast',
  inheritAttrs: false,
  props: {
    toast: {
      type: Object as PropType<GhostToastRecord>,
      required: true,
    },
    variant: {
      type: String as PropType<GhostToastVariant>,
      default: 'surface',
    },
    tone: {
      type: String as PropType<GhostToastTone | undefined>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostToastExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostToastExposed)

    const tone = computed(
      (): GhostToastTone =>
        props.tone ?? (props.toast.type === 'error' ? 'danger' : 'neutral'),
    )

    return () =>
      h(
        GhostUnstyledToast,
        {
          ...attrs,
          ref: inner,
          toast: props.toast,
          'data-themed': '',
          'data-variant':
            props.variant === 'surface' ? undefined : props.variant,
          'data-tone': tone.value === 'neutral' ? undefined : tone.value,
        },
        slots as { default?: (slotProps: GhostToastSlotProps) => unknown },
      )
  },
})

export type { GhostToastExposed, GhostToastRecord, GhostToastSlotProps }
