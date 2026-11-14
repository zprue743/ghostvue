import type { InputHTMLAttributes, MaybeRefOrGetter } from 'vue'

/** Options forwarded to `Intl.NumberFormat`. */
export type GhostNumberInputFormatOptions = Intl.NumberFormatOptions

/**
 * Unstyled {@link GhostNumberInput} props. Native attributes fall through to the
 * spinbutton input. `value` is omitted so the current number is `modelValue` /
 * `defaultValue`.
 */
export interface GhostNumberInputProps extends /* @vue-ignore */ Omit<
  InputHTMLAttributes,
  'value' | 'type' | 'role'
> {
  /**
   * Controlled value. Omit for uncontrolled mode. `null` is an empty field.
   */
  modelValue?: number | null

  /**
   * Initial uncontrolled value and form-reset seed.
   * @default null
   */
  defaultValue?: number | null

  /** Inclusive minimum. Sets `aria-valuemin` when defined. */
  min?: number

  /** Inclusive maximum. Sets `aria-valuemax` when defined. */
  max?: number

  /**
   * Step for buttons and keyboard.
   * @default 1
   */
  step?: number

  /** `Intl.NumberFormat` locale; runtime default when omitted. */
  locale?: string

  /** `Intl.NumberFormat` options. @default {} */
  formatOptions?: GhostNumberInputFormatOptions

  /** @default false */
  disabled?: boolean

  /** @default false */
  readonly?: boolean

  /** @default false */
  invalid?: boolean

  /** @default false */
  required?: boolean

  /**
   * Accessible name for the decrement button.
   * @default 'Decrease'
   */
  decrementLabel?: string

  /**
   * Accessible name for the increment button.
   * @default 'Increase'
   */
  incrementLabel?: string
}

export interface UseGhostNumberInputOptions {
  modelValue?: MaybeRefOrGetter<number | null | undefined>
  defaultValue?: MaybeRefOrGetter<number | null | undefined>
  min?: MaybeRefOrGetter<number | undefined>
  max?: MaybeRefOrGetter<number | undefined>
  step?: MaybeRefOrGetter<number | undefined>
  locale?: MaybeRefOrGetter<string | undefined>
  formatOptions?: MaybeRefOrGetter<GhostNumberInputFormatOptions | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  readonly?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  decrementLabel?: MaybeRefOrGetter<string | undefined>
  incrementLabel?: MaybeRefOrGetter<string | undefined>
  /** Spinbutton input for reset reconciliation and display sync. */
  element?: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  onChange?: (value: number | null) => void
}

/** Methods available from a template ref to {@link GhostNumberInput}. */
export interface GhostNumberInputExposed {
  readonly element: HTMLInputElement | null
  focus(options?: FocusOptions): void
  blur(): void
  increment(): void
  decrement(): void
}
