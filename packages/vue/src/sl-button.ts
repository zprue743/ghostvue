import type { ButtonHTMLAttributes, MaybeRefOrGetter } from 'vue'

/** Valid values for the native button `type` attribute. */
export type SlButtonType = 'button' | 'submit' | 'reset'

/**
 * Public props for the unstyled {@link SlButton} component.
 *
 * Vue ignores the native base while generating runtime props so those values
 * remain fallthrough attributes, while consumers still receive the complete
 * native button type at development time.
 */
export interface SlButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  /**
   * Prevents activation and removes the button from sequential focus order.
   * @default false
   */
  disabled?: boolean

  /**
   * Marks the action as pending and prevents duplicate activation. The button's
   * content remains rendered so its accessible name does not change.
   * @default false
   */
  loading?: boolean

  /**
   * Native button behavior. Defaults to `button` to avoid accidental form
   * submission; opt into `submit` or `reset` when intended.
   * @default 'button'
   */
  type?: SlButtonType
}

/** Options for {@link useSlButton}. */
export interface UseSlButtonOptions {
  disabled?: MaybeRefOrGetter<boolean | undefined>
  loading?: MaybeRefOrGetter<boolean | undefined>
  type?: MaybeRefOrGetter<SlButtonType | undefined>
}

/** Methods and state available from a template ref to {@link SlButton}. */
export interface SlButtonExposed {
  /** The native button element after mount, or `null` before mount. */
  readonly element: HTMLButtonElement | null

  /** Moves focus to the native button when it is mounted and enabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native button when it is mounted. */
  blur(): void
}
