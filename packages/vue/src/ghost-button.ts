import type { ButtonHTMLAttributes, MaybeRefOrGetter } from 'vue'

/** Native button `type` values. */
export type GhostButtonType = 'button' | 'submit' | 'reset'

/**
 * Unstyled {@link GhostButton} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full button contract for consumers.
 */
export interface GhostButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  /**
   * Prevents activation and removes the button from sequential focus order.
   * @default false
   */
  disabled?: boolean

  /**
   * Pending action; content stays so the accessible name does not change.
   * @default false
   */
  loading?: boolean

  /**
   * Native behavior. Defaults to `button` so forms are not submitted by accident.
   * @default 'button'
   */
  type?: GhostButtonType
}

/** Options for {@link useGhostButton}. */
export interface UseGhostButtonOptions {
  disabled?: MaybeRefOrGetter<boolean | undefined>
  loading?: MaybeRefOrGetter<boolean | undefined>
  type?: MaybeRefOrGetter<GhostButtonType | undefined>
}

/** Methods and state available from a template ref to {@link GhostButton}. */
export interface GhostButtonExposed {
  /** The native button element after mount, or `null` before mount. */
  readonly element: HTMLButtonElement | null

  /** Moves focus to the native button when it is mounted and enabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native button when it is mounted. */
  blur(): void
}
