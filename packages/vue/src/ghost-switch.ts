import type { ButtonHTMLAttributes, MaybeRefOrGetter } from 'vue'

/**
 * Unstyled {@link GhostSwitch} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full button contract for consumers.
 * `name`, `value`, and `form` are declared so they route to the hidden form
 * input rather than the button.
 */
export interface GhostSwitchProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  /**
   * Controlled on/off. Omit for uncontrolled mode. `undefined` is required as
   * the default so Vue does not coerce an omitted boolean prop to `false`.
   */
  modelValue?: boolean

  /**
   * Initial on/off when `modelValue` is omitted. Later changes are ignored.
   * Form reset restores this mounted value.
   * @default false
   */
  defaultValue?: boolean

  /**
   * Native disabled: not focusable, not operable, not submitted.
   * @default false
   */
  disabled?: boolean

  /**
   * Focusable but not user-operable. Still submitted. Programmatic model
   * writes still apply. Not a native button attribute; expressed as
   * `aria-readonly`.
   * @default false
   */
  readonly?: boolean

  /**
   * Form field name. When set, a hidden input submits `name=value` while on
   * and enabled.
   */
  name?: string

  /**
   * Submitted string when on. Same default as a native checkbox.
   * @default 'on'
   */
  value?: string

  /**
   * Associates the hidden input (and the button `form` IDL) with an external
   * form id.
   */
  form?: string
}

/** Options for {@link useGhostSwitch}. */
export interface UseGhostSwitchOptions {
  modelValue?: MaybeRefOrGetter<boolean | undefined>
  defaultValue?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  readonly?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  value?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  /** Synchronous `update:modelValue` write. */
  onChange?: (checked: boolean) => void
  /**
   * Mounted button, used to find `button.form` for native reset. Omit when
   * the composable host does not participate in forms.
   */
  element?: MaybeRefOrGetter<HTMLButtonElement | null | undefined>
}

/** Methods and state available from a template ref to {@link GhostSwitch}. */
export interface GhostSwitchExposed {
  /** The native switch button after mount, or `null` before mount. */
  readonly element: HTMLButtonElement | null

  /** Current on/off. */
  readonly checked: boolean

  /** User-activation toggle. No-op when disabled or readonly. */
  toggle(): void

  /** Moves focus to the native button when it is mounted and enabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native button when it is mounted. */
  blur(): void
}
