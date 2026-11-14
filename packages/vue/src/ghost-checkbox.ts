import type { InputHTMLAttributes, MaybeRefOrGetter } from 'vue'

/**
 * Unstyled {@link GhostCheckbox} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the input contract for consumers.
 * `checked` and `type` are omitted so they cannot fight the model or native checkbox type.
 */
export interface GhostCheckboxProps extends /* @vue-ignore */ Omit<
  InputHTMLAttributes,
  'checked' | 'type'
> {
  /**
   * Controlled checked state. `undefined` is uncontrolled; `false` is unchecked.
   * Mixed is {@link GhostCheckboxProps.indeterminate}, not a third model value.
   */
  modelValue?: boolean

  /**
   * Initial checked state when `modelValue` is omitted. Later changes are ignored.
   * @default false
   */
  defaultValue?: boolean

  /**
   * Mixed state for select-all and similar. Applied via the DOM `indeterminate`
   * property. Consumer-owned; not part of the v-model.
   * @default false
   */
  indeterminate?: boolean

  /**
   * Native disabled semantics: no activation, no sequential focus, excluded from submit.
   * @default false
   */
  disabled?: boolean
}

/** Options for {@link useGhostCheckbox}. */
export interface UseGhostCheckboxOptions {
  modelValue?: MaybeRefOrGetter<boolean | undefined>
  defaultValue?: MaybeRefOrGetter<boolean | undefined>
  indeterminate?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /** Native input for post-reset DOM reconciliation. */
  element?: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  /** Synchronous write. Emit `update:modelValue` here. */
  onChange?: (value: boolean) => void
}

/** Check triad exposed as `data-state`. Unchecked omits the attribute. */
export type GhostCheckboxDataState = 'checked' | 'indeterminate'

/** Methods and state available from a template ref to {@link GhostCheckbox}. */
export interface GhostCheckboxExposed {
  /** The native checkbox after mount, or `null` before mount. */
  readonly element: HTMLInputElement | null

  /** Moves focus to the native checkbox when it is mounted and enabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native checkbox when it is mounted. */
  blur(): void
}
