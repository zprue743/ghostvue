import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

/** Label set for platform-aware modifier keys. */
export type GhostKbdPlatform = 'auto' | 'apple' | 'pc'

/** Resolved platform after `'auto'` is replaced. Always one of these on the DOM. */
export type GhostKbdResolvedPlatform = 'apple' | 'pc'

/**
 * Unstyled {@link GhostKbd} props. `@vue-ignore` keeps native phrasing
 * attributes as fallthrough at runtime while typing them for consumers.
 */
export interface GhostKbdProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * Key tokens rendered as nested `<kbd>` elements. A string is one key;
   * an array is a combination joined with `+`. Not split on `+` because
   * that character is a valid key.
   */
  keys?: string | readonly string[]

  /**
   * Modifier label set. `'auto'` uses PC labels until after mount.
   * @default 'auto'
   */
  platform?: GhostKbdPlatform
}

/** Options for {@link useGhostKbd}. */
export interface UseGhostKbdOptions {
  keys?: MaybeRefOrGetter<string | readonly string[] | undefined>
  platform?: MaybeRefOrGetter<GhostKbdPlatform | undefined>
}

/** One resolved key for nested `<kbd data-part="key">` rendering. */
export interface GhostKbdKeyItem {
  /** Canonical token after alias folding (`command` → `meta`). */
  token: string
  /** Visible label for the current resolved platform. */
  label: string
  /**
   * Accessible expansion for symbol labels (`⌘` → Command). Omitted when the
   * visible label is already a word.
   */
  abbrTitle?: string
}
