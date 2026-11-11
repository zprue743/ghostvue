import { defineComponent, h, ref, type PropType } from 'vue'

import {
  SlButton as SlUnstyledButton,
  useSlInteractiveSurface,
  type SlButtonExposed,
  type SlButtonType,
} from '@slop-ui/vue'

/** Visual treatment for the themed button. Omitting it selects `solid`. */
export type SlButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost'

/** Semantic color intent, independent of {@link SlButtonVariant}. */
export type SlButtonTone = 'accent' | 'neutral' | 'danger'

/** Visual size. Omitting it selects `md`. */
export type SlButtonSize = 'sm' | 'md' | 'lg'

/** Opt-in pointer spotlight. Omitting it leaves the button inert. */
export type SlButtonInteractive = 'spotlight'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
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
    interactive: {
      type: String as PropType<SlButtonInteractive>,
      default: undefined,
    },
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

    const { rootProps } = useSlInteractiveSurface(() => inner.value?.element, {
      effects: () => (props.interactive === 'spotlight' ? ['spotlight'] : []),
      stateAttribute: 'data-interactive-state',
    })

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
            'data-interactive':
              props.interactive === 'spotlight' ? 'spotlight' : undefined,
            'data-interactive-state': rootProps.value['data-interactive-state'],
          },
          props.interactive === 'spotlight'
            ? {
                default: () => [
                  h('span', { 'data-part': 'glow', 'aria-hidden': 'true' }),
                  slots['default']?.(),
                ],
              }
            : slots,
        ),
      ])
  },
})

export type { SlButtonExposed, SlButtonType }
