import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

/** Root element for {@link GhostAvatar}. */
export type GhostAvatarElement = 'span' | 'div'

/** Client image pipeline state. `idle` means no `src` was provided. */
export type GhostAvatarImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

/** `data-state` on the avatar root while an image `src` is in play. */
export type GhostAvatarDataState = 'loading' | 'loaded' | 'error'

/**
 * Unstyled {@link GhostAvatar} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the host contract for consumers.
 */
export interface GhostAvatarProps extends /* @vue-ignore */ HTMLAttributes {
  /** Image URL. Omit for initials-only avatars. */
  src?: string

  /**
   * Accessible name for the loaded `<img>`. Falls back to {@link name}. Use an
   * empty string when a parent control already names the entity.
   */
  alt?: string

  /**
   * Display name used for fallback initials and as the default `alt` when the
   * image loads.
   */
  name?: string

  /**
   * Root host. Stay within valid HTML for the parent context.
   * @default 'span'
   */
  as?: GhostAvatarElement
}

/** Options for {@link useGhostAvatar}. */
export interface UseGhostAvatarOptions {
  src?: MaybeRefOrGetter<string | undefined>
  alt?: MaybeRefOrGetter<string | undefined>
  name?: MaybeRefOrGetter<string | undefined>
}

/** Methods and state available from a template ref to {@link GhostAvatar}. */
export interface GhostAvatarExposed {
  /** The root host element after mount, or `null` before mount. */
  readonly element: HTMLElement | null
}
