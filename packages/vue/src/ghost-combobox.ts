import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  CSSProperties,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import { resolvePopoverHtmlElement } from './ghost-popover'

/** @see resolvePopoverHtmlElement */
export const resolveComboboxHtmlElement = resolvePopoverHtmlElement

export type GhostComboboxInputElement = string | Component
export type GhostComboboxTriggerElement = string | Component
export type GhostComboboxContentElement = string | Component
export type GhostComboboxOptionElement = string | Component
export type GhostComboboxGroupElement = string | Component
export type GhostComboboxLabelElement = string | Component
export type GhostComboboxEmptyElement = string | Component

export type GhostComboboxPlacement = Placement
export type GhostComboboxStrategy = Strategy

export type GhostComboboxPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

export type GhostComboboxOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

export interface GhostComboboxFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostComboboxPlacement[]
  padding?: GhostComboboxPadding
  boundary?: Element | Element[]
}

export interface GhostComboboxShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostComboboxPadding
  boundary?: Element | Element[]
}

export interface GhostComboboxOptionRecord {
  value: string
  textValue: string
  disabled: boolean
  optionId: string
  getElement: () => HTMLElement | null
}

export type GhostComboboxValue = string | string[] | undefined

/** Native submit + `required` constraint validation (not `type=hidden`). */
export interface GhostComboboxFormInputProps {
  type: 'text'
  name: string | undefined
  value: string
  form: string | undefined
  disabled: boolean | undefined
  required: boolean | undefined
  tabindex: -1
  'aria-hidden': true
  class: 'ghost-visually-hidden'
  style: CSSProperties
  autocomplete: 'off'
}

/** Visually-hidden polite live region bindings for {@link GhostCombobox}. */
export interface GhostComboboxLiveRegionProps {
  id: string
  class: 'ghost-visually-hidden'
  style: CSSProperties
  'aria-live': 'polite'
  'aria-atomic': true
  'data-part': 'announcer'
}

export interface GhostComboboxSearchPayload {
  query: string
  requestId: number
}

/** Overridable internal strings and formatters for {@link GhostCombobox}. */
export interface GhostComboboxMessages {
  /** Live-region announcement while `loading` is true. @default 'Loading results' */
  loading?: string
  /** Live-region announcement when open with zero enabled options. @default 'No results available' */
  empty?: string
  /**
   * Live-region announcement formatter when open with `count > 0` enabled options.
   * @default (count) => `${String(count)} results available`
   */
  results?: (count: number) => string
  /** Native constraint validation message when `required` and empty. @default 'Select a value.' */
  required?: string
}

export interface GhostComboboxContext {
  multiple: ComputedRef<boolean>
  virtualized: ComputedRef<boolean>
  selectedValue: Ref<GhostComboboxValue>
  searchValue: Ref<string>
  isOpen: Ref<boolean>
  loading: ComputedRef<boolean>
  open: () => void
  close: () => void
  toggleOpen: () => void
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  allowDeselect: ComputedRef<boolean>
  placeholder: ComputedRef<string | undefined>
  defaultInputId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  inputId: ComputedRef<string>
  contentId: ComputedRef<string>
  inputElement: Ref<HTMLElement | null>
  contentElement: Ref<HTMLElement | null>
  listboxElement: Ref<HTMLElement | null>
  openedAtMount: Ref<boolean>
  setInputElement: (element: HTMLElement | null) => void
  setContentElement: (element: HTMLElement | null) => void
  setListboxElement: (element: HTMLElement | null) => void
  setInputId: (id: string | null) => void
  setContentId: (id: string | null) => void
  setInputRegistered: (registered: boolean) => void
  inputRegistered: Ref<boolean>
  /** Optional companion trigger; part of the widget for focus departure. */
  triggerElement: Ref<HTMLElement | null>
  setTriggerElement: (element: HTMLElement | null) => void
  /**
   * Called from `focusout` on the input, trigger, and content. Closes and
   * resets the transient search only when focus leaves all of them.
   */
  notifyFocusOut: (event: FocusEvent) => void
  /**
   * Called from `pointerdown` on the input, trigger, and content so a press
   * inside the widget that blurs to `body` is not treated as focus departure.
   */
  notifyPointerDownInside: () => void
  /**
   * True while a focus-departure close is pending, so the content's focus
   * scope does not pull focus back to the input after the user moved away.
   */
  focusRestoreSuppressed: Ref<boolean>
  registerOption: (
    value: string,
    textValue: string,
    disabled: boolean,
    optionId: string,
    getElement: () => HTMLElement | null,
  ) => void
  unregisterOption: (value: string) => void
  setOptionDisabled: (value: string, disabled: boolean) => void
  setOptionTextValue: (value: string, textValue: string) => void
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isOptionDisabled: (value: string) => boolean
  optionOrder: ComputedRef<string[]>
  optionCount: ComputedRef<number>
  getOptionText: (value: string) => string | undefined
  getOptionId: (value: string) => string | undefined
  activeOptionValue: Ref<string | undefined>
  activeDescendantId: ComputedRef<string | undefined>
  moveActive: (direction: 1 | -1) => void
  setActiveOptionByValue: (value: string | undefined) => void
  moveActiveFirst: () => void
  moveActiveLast: () => void
  onInputSearch: (query: string) => void
  labelVersion: Ref<number>
  announceMessage: Ref<string>
  liveRegionId: ComputedRef<string>
}

export const ghostComboboxContextKey: InjectionKey<GhostComboboxContext> =
  Symbol('ghost-combobox')

export const ghostComboboxGroupLabelKey: InjectionKey<{
  setLabelId: (id: string | null) => void
}> = Symbol('ghost-combobox-group-label')

export interface GhostComboboxInputExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostComboboxTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostComboboxContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostComboboxOptionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostComboboxExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface UseGhostComboboxOptions {
  multiple?: MaybeRefOrGetter<boolean | undefined>
  virtualized?: MaybeRefOrGetter<boolean | undefined>
  modelValue?: MaybeRefOrGetter<GhostComboboxValue>
  defaultValue?: MaybeRefOrGetter<GhostComboboxValue>
  search?: MaybeRefOrGetter<string | undefined>
  defaultSearch?: MaybeRefOrGetter<string | undefined>
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  loading?: MaybeRefOrGetter<boolean | undefined>
  allowDeselect?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  placeholder?: MaybeRefOrGetter<string | undefined>
  messages?: MaybeRefOrGetter<GhostComboboxMessages | undefined>
  onValueChange?: (value: GhostComboboxValue) => void
  onSearchChange?: (query: string) => void
  onSearch?: (payload: GhostComboboxSearchPayload) => void
  onOpenChange?: (open: boolean) => void
  getFormInput?: () => HTMLInputElement | null
}
