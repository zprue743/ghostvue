import type { HTMLAttributes, MaybeRefOrGetter } from 'vue'

export type GhostSliderOrientation = 'horizontal' | 'vertical'

export type GhostSliderValue = number | readonly [number, number]

/**
 * Unstyled {@link GhostSlider} props. Native attributes fall through to the root
 * track container.
 */
export interface GhostSliderProps extends /* @vue-ignore */ HTMLAttributes {
  /**
   * Controlled value. Single-thumb mode uses a number; `range` uses a tuple.
   * Omit for uncontrolled mode.
   */
  modelValue?: GhostSliderValue

  /**
   * Initial value when `modelValue` is omitted. Captured at mount for reset.
   */
  defaultValue?: GhostSliderValue

  /** @default 0 */
  min?: number

  /** @default 100 */
  max?: number

  /** @default 1 */
  step?: number

  /** Two-thumb interval selection. @default false */
  range?: boolean

  /** @default 'horizontal' */
  orientation?: GhostSliderOrientation

  /** @default false */
  disabled?: boolean

  /** Hidden input name for the primary (low / only) value. */
  name?: string

  /** Hidden input name for the high thumb when `range` is true. */
  nameMax?: string

  /** Associates hidden inputs with an external form id. */
  form?: string

  /** Optional `aria-valuetext` for the sole thumb in single mode. */
  valueText?: string
}

export interface UseGhostSliderOptions {
  modelValue?: MaybeRefOrGetter<GhostSliderValue | undefined>
  defaultValue?: MaybeRefOrGetter<GhostSliderValue | undefined>
  min?: MaybeRefOrGetter<number | undefined>
  max?: MaybeRefOrGetter<number | undefined>
  step?: MaybeRefOrGetter<number | undefined>
  range?: MaybeRefOrGetter<boolean | undefined>
  orientation?: MaybeRefOrGetter<GhostSliderOrientation | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  nameMax?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  valueText?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<string | undefined>
  /** Copied from root `aria-labelledby` for thumb sliders. */
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>
  onChange?: (value: GhostSliderValue) => void
  root?: MaybeRefOrGetter<HTMLElement | null | undefined>
}

/** Methods available from a template ref to {@link GhostSlider}. */
export interface GhostSliderExposed {
  readonly element: HTMLElement | null
  readonly value: GhostSliderValue
  focus(options?: FocusOptions): void
  blur(): void
}
