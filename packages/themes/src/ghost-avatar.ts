import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostAvatar as GhostUnstyledAvatar,
  type GhostAvatarExposed,
} from '@ghostvue/vue'

/** Square avatar dimensions. Omitting selects `md`. */
export type GhostAvatarSize = 'sm' | 'md' | 'lg'

/**
 * Themed wrapper: `data-size` hooks and scoped CSS. Behavior stays on the
 * unstyled primitive; native attrs fall through.
 */
export const GhostAvatar = defineComponent({
  name: 'GhostAvatar',
  inheritAttrs: false,
  props: {
    src: { type: String, default: undefined },
    alt: { type: String, default: undefined },
    name: { type: String, default: undefined },
    as: { type: String as PropType<'span' | 'div'>, default: 'span' },
    size: { type: String as PropType<GhostAvatarSize>, default: 'md' },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostAvatarExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostAvatarExposed)

    return () => {
      const avatarProps = {
        ...attrs,
        ref: inner,
        as: props.as,
        'data-size': props.size === 'md' ? undefined : props.size,
        ...(props.src !== undefined ? { src: props.src } : {}),
        ...(props.alt !== undefined ? { alt: props.alt } : {}),
        ...(props.name !== undefined ? { name: props.name } : {}),
      }

      return h('span', { class: 'ghost-themed-scope' }, [
        h(GhostUnstyledAvatar, avatarProps, slots),
      ])
    }
  },
})

export type { GhostAvatarExposed }
