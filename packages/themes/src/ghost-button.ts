import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostButton as GhostUnstyledButton,
  useGhostInteractiveSurface,
  type GhostButtonExposed,
  type GhostButtonType,
} from '@ghostvue/vue'

/** Visual treatment for the themed button. Omitting it selects `solid`. */
export type GhostButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost'

/** Semantic color intent, independent of {@link GhostButtonVariant}. */
export type GhostButtonTone = 'accent' | 'neutral' | 'danger'

/** Visual size. Omitting it selects `md`. */
export type GhostButtonSize = 'sm' | 'md' | 'lg'

/** Opt-in pointer spotlight. Omitting it leaves the button inert. */
export type GhostButtonInteractive = 'spotlight'

/**
 * Themed wrapper: visual props as `data-*`, instance-scoped CSS. Behavior stays
 * on the unstyled primitive; native attrs fall through.
 */
export const GhostButton = defineComponent({
  name: 'GhostButton',
  inheritAttrs: false,
  props: {
    type: { type: String as PropType<GhostButtonType>, default: 'button' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    variant: { type: String as PropType<GhostButtonVariant>, default: 'solid' },
    tone: { type: String as PropType<GhostButtonTone>, default: 'accent' },
    size: { type: String as PropType<GhostButtonSize>, default: 'md' },
    block: { type: Boolean, default: false },
    iconOnly: { type: Boolean, default: false },
    interactive: {
      type: String as PropType<GhostButtonInteractive>,
      default: undefined,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostButtonExposed | null>(null)

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
    } satisfies GhostButtonExposed)

    const { rootProps } = useGhostInteractiveSurface(
      () => inner.value?.element,
      {
        effects: () => (props.interactive === 'spotlight' ? ['spotlight'] : []),
        stateAttribute: 'data-interactive-state',
      },
    )

    return () =>
      h('span', { class: 'ghost-themed-scope' }, [
        h(
          GhostUnstyledButton,
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

export type { GhostButtonExposed, GhostButtonType }
