import type { InputHTMLAttributes, MaybeRefOrGetter } from 'vue'

/**
 * HTML text-like types only. `number` belongs to GhostNumberInput; checkbox,
 * radio, file, and temporal widgets are separate primitives.
 */
export type GhostInputType =
  'text' | 'search' | 'email' | 'password' | 'tel' | 'url'

/**
 * Unstyled {@link GhostInput} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the input contract for consumers.
 * `value` is omitted so the current text is `modelValue` / `defaultValue`.
 */
export interface GhostInputProps extends /* @vue-ignore */ Omit<
  InputHTMLAttributes,
  'value'
> {
  /**
   * Controlled value. Omit for uncontrolled mode. An empty string is a real
   * controlled value, not "unset".
   */
  modelValue?: string

  /**
   * Initial uncontrolled value. Later changes are ignored.
   * @default ''
   */
  defaultValue?: string

  /**
   * Prevents editing and sequential focus, and omits the field from submit.
   * @default false
   */
  disabled?: boolean

  /**
   * Prevents editing while remaining focusable and submitted.
   * @default false
   */
  readonly?: boolean

  /**
   * Consumer-owned validity. Sets `aria-invalid`, not native ValidityState.
   * @default false
   */
  invalid?: boolean

  /**
   * Native required constraint.
   * @default false
   */
  required?: boolean

  /**
   * Native text-like type.
   * @default 'text'
   */
  type?: GhostInputType
}

/** Options for {@link useGhostInput}. */
export interface UseGhostInputOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  readonly?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  type?: MaybeRefOrGetter<GhostInputType | undefined>
  /** Native input for post-reset DOM reconciliation. */
  element?: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  /** Synchronous write. Emit `update:modelValue` here. */
  onChange?: (value: string) => void
}

/** Methods and state available from a template ref to {@link GhostInput}. */
export interface GhostInputExposed {
  /** The native input after mount, or `null` before mount. */
  readonly element: HTMLInputElement | null

  /** Moves focus to the native input when it is mounted and not disabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native input when it is mounted. */
  blur(): void
}
