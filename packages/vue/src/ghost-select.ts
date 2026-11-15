import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import { resolvePopoverHtmlElement } from './ghost-popover'

/** @see resolvePopoverHtmlElement */
export const resolveSelectHtmlElement = resolvePopoverHtmlElement

export type GhostSelectTriggerElement = string | Component
export type GhostSelectContentElement = string | Component
export type GhostSelectOptionElement = string | Component
export type GhostSelectGroupElement = string | Component
export type GhostSelectLabelElement = string | Component

export type GhostSelectPlacement = Placement
export type GhostSelectStrategy = Strategy

export type GhostSelectPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

export type GhostSelectOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

export interface GhostSelectFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostSelectPlacement[]
  padding?: GhostSelectPadding
  boundary?: Element | Element[]
}

export interface GhostSelectShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostSelectPadding
  boundary?: Element | Element[]
}

export interface GhostSelectOptionRecord {
  value: string
  textValue: string
  disabled: boolean
  getElement: () => HTMLElement | null
}

export interface GhostSelectContext {
  selectedValue: Ref<string | undefined>
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  placeholder: ComputedRef<string | undefined>
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  triggerElement: Ref<HTMLElement | null>
  contentElement: Ref<HTMLElement | null>
  triggerRegistered: Ref<boolean>
  openedAtMount: Ref<boolean>
  setTriggerElement: (element: HTMLElement | null) => void
  setContentElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setContentId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  registerOption: (
    value: string,
    textValue: string,
    disabled: boolean,
    getElement: () => HTMLElement | null,
  ) => void
  unregisterOption: (value: string) => void
  setOptionDisabled: (value: string, disabled: boolean) => void
  setOptionTextValue: (value: string, textValue: string) => void
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isOptionDisabled: (value: string) => boolean
  optionOrder: ComputedRef<string[]>
  getOptionText: (value: string) => string | undefined
  handleTypeahead: (event: KeyboardEvent) => void
  focusOptionByValue: (value: string) => void
  focusFirstEnabledOption: (fromEnd?: boolean) => void
  labelVersion: Ref<number>
}

export const ghostSelectContextKey: InjectionKey<GhostSelectContext> =
  Symbol('ghost-select')

export interface GhostSelectTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostSelectContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostSelectOptionExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface GhostSelectExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

export interface UseGhostSelectOptions {
  modelValue?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  disabled?: MaybeRefOrGetter<boolean | undefined>
  required?: MaybeRefOrGetter<boolean | undefined>
  invalid?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  placeholder?: MaybeRefOrGetter<string | undefined>
  onValueChange?: (value: string | undefined) => void
  onOpenChange?: (open: boolean) => void
  getFormInput?: () => HTMLInputElement | null
}
