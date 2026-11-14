import type { MaybeRefOrGetter, TextareaHTMLAttributes } from 'vue'

/**
 * Unstyled {@link GhostTextarea} props. `@vue-ignore` keeps native attributes as
 * fallthrough at runtime while typing the full textarea contract for consumers.
 */
export interface GhostTextareaProps extends /* @vue-ignore */ TextareaHTMLAttributes {
  /**
   * Controlled value. Omit for uncontrolled mode; `''` is a defined empty string.
   */
  modelValue?: string

  /**
   * Initial uncontrolled value. Later changes are ignored.
   * @default ''
   */
  defaultValue?: string

  /**
   * Native disabled semantics: not focusable, not editable, omitted from submit.
   * @default false
   */
  disabled?: boolean

  /**
   * Native readonly semantics: focusable and submitted, but the UA rejects edits.
   * @default false
   */
  readonly?: boolean

  /**
   * Consumer-owned invalid state. Sets `aria-invalid="true"`; error copy belongs
   * to Field or the surrounding form.
   * @default false
   */
  invalid?: boolean

  /**
   * Native required constraint. Validation messaging stays with the form.
   * @default false
   */
  required?: boolean

  /**
   * Native `rows`. Matches the HTML default so SSR and the UA agree. Auto-resize
   * uses this as the minimum height.
   * @default 2
   */
  rows?: number

  /**
   * Auto-resize ceiling in rows. Ignored unless `autoResize` is true. When set
   * below `rows`, `rows` wins as both min and max.
   */
  maxRows?: number

  /**
   * Grow the field with its content after mount. Off so native resize and a
   * fixed `rows` height stay the ordinary path.
   * @default false
   */
  autoResize?: boolean
}

/** Options for {@link useGhostTextarea}. */
export interface UseGhostTextareaOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  readonly?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  rows?: MaybeRefOrGetter<number | undefined>
  maxRows?: MaybeRefOrGetter<number | undefined>
  autoResize?: MaybeRefOrGetter<boolean | undefined>
  /** Host used for auto-resize measurement. Omit when calling `resize()` yourself. */
  element?: MaybeRefOrGetter<HTMLTextAreaElement | null | undefined>
  onValueChange?: (value: string) => void
}

/** Methods and state available from a template ref to {@link GhostTextarea}. */
export interface GhostTextareaExposed {
  /** The native textarea after mount, or `null` before mount. */
  readonly element: HTMLTextAreaElement | null

  /** Moves focus to the native textarea when it is mounted and enabled. */
  focus(options?: FocusOptions): void

  /** Removes focus from the native textarea when it is mounted. */
  blur(): void
}
