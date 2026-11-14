import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

export type GhostRadioGroupOrientation = 'horizontal' | 'vertical'

/** Valid `as` targets for {@link GhostRadioGroup}. */
export type GhostRadioGroupElement = string | Component

/** Props for {@link GhostRadioGroup}. */
export interface GhostRadioGroupProps {
  /**
   * Controlled selected value. Omit for uncontrolled mode.
   * @default undefined
   */
  modelValue?: string | undefined
  /**
   * Initial selected value when `modelValue` is omitted. Form reset restores
   * this captured seed.
   * @default undefined
   */
  defaultValue?: string | undefined
  /** Shared native `name` for item inputs. */
  name?: string | undefined
  /** Disables the whole group. */
  disabled?: boolean
  /** Required semantics propagated to item inputs. */
  required?: boolean
  /** Invalid semantics for Field integration (`aria-invalid` on root). */
  invalid?: boolean
  /**
   * Layout and roving arrow-key orientation.
   * @default 'vertical'
   */
  orientation?: GhostRadioGroupOrientation
  /**
   * Root host element.
   * @default 'fieldset'
   */
  as?: GhostRadioGroupElement
}

/** Props for {@link GhostRadioGroupItem}. */
export interface GhostRadioGroupItemProps {
  /** Option value; must be unique within the group. */
  value: string
  /** Disables this option only. */
  disabled?: boolean
}

/** Methods exposed by {@link GhostRadioGroup}. */
export interface GhostRadioGroupExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods exposed by {@link GhostRadioGroupItem}. */
export interface GhostRadioGroupItemExposed {
  readonly element: HTMLInputElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostRadioGroup}. */
export interface UseGhostRadioGroupOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  orientation?: MaybeRefOrGetter<GhostRadioGroupOrientation | undefined>
  onValueChange?: (value: string) => void
}

/** Reactive state returned by {@link useGhostRadioGroup}. */
export interface UseGhostRadioGroupReturn {
  selectedValue: Ref<string | undefined>
  name: ComputedRef<string>
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  orientation: ComputedRef<GhostRadioGroupOrientation>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isItemDisabled: (value: string) => boolean
  registerItem: (
    value: string,
    disabled: boolean,
    getElement: () => HTMLInputElement | null,
  ) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  restoreItemDom: (value: string) => void
  applyFormReset: () => void
  registryVersion: Ref<number>
}

/** Shared context between radio group parts. */
export interface GhostRadioGroupContext {
  readonly selectedValue: Ref<string | undefined>
  name: ComputedRef<string>
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isItemDisabled: (value: string) => boolean
  registerItem: (
    value: string,
    disabled: boolean,
    getElement: () => HTMLInputElement | null,
  ) => void
  setItemDisabled: (value: string, disabled: boolean) => void
  unregisterItem: (value: string) => void
  restoreItemDom: (value: string) => void
  registryVersion: Ref<number>
}

export const ghostRadioGroupContextKey: InjectionKey<GhostRadioGroupContext> =
  Symbol('ghost-radio-group')
