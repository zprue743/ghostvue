import { defineComponent, h, ref, type PropType } from 'vue'

import {
  SlButton as SlUnstyledButton,
  type SlButtonExposed,
  type SlButtonType,
} from '@slop-ui/vue'

/** Visual treatment for the themed button. Omitting it selects `solid`. */
export type SlButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost'

/** Semantic color intent, independent of {@link SlButtonVariant}. */
export type SlButtonTone = 'accent' | 'neutral' | 'danger'

/** Visual size. Omitting it selects `md`. */
export type SlButtonSize = 'sm' | 'md' | 'lg'

/**
 * Themed `SlButton` wraps the unstyled primitive, applies visual props as
 * `data-*` hooks, and scopes default CSS to this instance.
 *
 * Behavioral props match `@slop-ui/vue`. Visual props exist only here; they are
 * never on the headless component. Native attributes fall through to the inner
 * button. Toggle `pressed` is out of scope, so controllable state is unused.
 */
export const SlButton = defineComponent({
  name: 'SlButton',
  inheritAttrs: false,
  props: {
    type: { type: String as PropType<SlButtonType>, default: 'button' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    variant: { type: String as PropType<SlButtonVariant>, default: 'solid' },
    tone: { type: String as PropType<SlButtonTone>, default: 'accent' },
    size: { type: String as PropType<SlButtonSize>, default: 'md' },
    block: { type: Boolean, default: false },
    iconOnly: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<SlButtonExposed | null>(null)

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
    } satisfies SlButtonExposed)

    return () =>
      h('span', { class: 'slop-themed-scope' }, [
        h(
          SlUnstyledButton,
          {
            ...attrs,
            ref: inner,
            type: props.type,
            disabled: props.disabled,
            loading: props.loading,
            // CSS treats missing attributes as the defaults (solid / accent / md).
            'data-variant':
              props.variant === 'solid' ? undefined : props.variant,
            'data-tone': props.tone === 'accent' ? undefined : props.tone,
            'data-size': props.size === 'md' ? undefined : props.size,
            'data-block': props.block ? '' : undefined,
            'data-icon-only': props.iconOnly ? '' : undefined,
          },
          slots,
        ),
      ])
  },
})

export type { SlButtonExposed, SlButtonType }
