import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for the {@link GhostMenubar} root. */
export type GhostMenubarElement = string | Component

/** Valid `as` targets for {@link GhostMenubarTrigger}. */
export type GhostMenubarTriggerElement = string | Component

/** Valid `as` targets for {@link GhostMenubarContent}. */
export type GhostMenubarContentElement = string | Component

/** Valid `as` targets for {@link GhostMenubarItem}. */
export type GhostMenubarItemElement = string | Component

/** Valid `as` targets for {@link GhostMenubarGroup}. */
export type GhostMenubarGroupElement = string | Component

/** Valid `as` targets for {@link GhostMenubarLabel}. */
export type GhostMenubarLabelElement = string | Component

/** Valid `as` targets for {@link GhostMenubarSeparator}. */
export type GhostMenubarSeparatorElement = string | Component

/** Valid `as` targets for {@link GhostMenubarCheckboxItem}. */
export type GhostMenubarCheckboxItemElement = string | Component

/** Valid `as` targets for {@link GhostMenubarRadioGroup}. */
export type GhostMenubarRadioGroupElement = string | Component

/** Valid `as` targets for {@link GhostMenubarRadioItem}. */
export type GhostMenubarRadioItemElement = string | Component

/** Supported floating placements relative to the trigger anchor. */
export type GhostMenubarPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostMenubarStrategy = Strategy

/** Viewport/boundary padding accepted by flip and shift options. */
export type GhostMenubarPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between trigger and menu content. */
export type GhostMenubarOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostMenubarContent}. */
export interface GhostMenubarFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostMenubarPlacement[]
  padding?: GhostMenubarPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostMenubarContent}. */
export interface GhostMenubarShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostMenubarPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostMenubar} root component. */
export interface GhostMenubarProps {
  /**
   * Tag name or component rendered for the menubar container.
   * @default 'div'
   */
  as?: GhostMenubarElement
  /** Text direction for horizontal arrow-key roving. */
  dir?: 'ltr' | 'rtl'
}

/** Props for the {@link GhostMenubarMenu} root provider component. */
export interface GhostMenubarMenuProps {
  /**
   * Controlled open state. Omit to run uncontrolled from `defaultOpen`.
   * @default undefined
   */
  open?: boolean | undefined
  /**
   * Initial open state when `open` is omitted.
   * @default false
   */
  defaultOpen?: boolean
}

/** Props passed to the {@link GhostMenubarMenu} default slot. */
export interface GhostMenubarMenuSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostMenubarTrigger}. */
export interface GhostMenubarTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostMenubarTriggerElement
  /**
   * Disables activation and menubar roving.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostMenubarContent}. */
export interface GhostMenubarContentProps {
  /**
   * Tag name or component rendered for the menu surface.
   * @default 'div'
   */
  as?: GhostMenubarContentElement
  /** Preferred placement relative to the trigger. */
  placement?: GhostMenubarPlacement
  offset?: GhostMenubarOffsetOptions | boolean | undefined
  flip?: boolean | GhostMenubarFlipOptions
  shift?: boolean | GhostMenubarShiftOptions
  strategy?: GhostMenubarStrategy
  portal?: boolean
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostMenubarItem}. */
export interface GhostMenubarItemProps {
  as?: GhostMenubarItemElement
  disabled?: boolean
}

/** Props for {@link GhostMenubarGroup}. */
export interface GhostMenubarGroupProps {
  as?: GhostMenubarGroupElement
}

/** Props for {@link GhostMenubarLabel}. */
export interface GhostMenubarLabelProps {
  as?: GhostMenubarLabelElement
}

/** Props for {@link GhostMenubarSeparator}. */
export interface GhostMenubarSeparatorProps {
  as?: GhostMenubarSeparatorElement
  decorative?: boolean
}

/** Props for {@link GhostMenubarCheckboxItem}. */
export interface GhostMenubarCheckboxItemProps {
  as?: GhostMenubarCheckboxItemElement
  checked?: boolean | undefined
  defaultChecked?: boolean
  disabled?: boolean
}

/** Props for {@link GhostMenubarRadioGroup}. */
export interface GhostMenubarRadioGroupProps {
  as?: GhostMenubarRadioGroupElement
  modelValue?: string | undefined
  defaultValue?: string | undefined
  disabled?: boolean
}

/** Props for {@link GhostMenubarRadioItem}. */
export interface GhostMenubarRadioItemProps {
  as?: GhostMenubarRadioItemElement
  value: string
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostMenubar}. */
export interface GhostMenubarExposed {
  readonly element: HTMLElement | null
}

/** Methods and state exposed by a template ref to {@link GhostMenubarTrigger}. */
export interface GhostMenubarTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostMenubarContent}. */
export interface GhostMenubarContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostMenubarItem}. */
export interface GhostMenubarItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostMenubarCheckboxItem}. */
export interface GhostMenubarCheckboxItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostMenubarRadioItem}. */
export interface GhostMenubarRadioItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostMenubarMenu}. */
export interface UseGhostMenubarMenuOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostMenubarMenu}. */
export interface UseGhostMenubarMenuReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between menubar menu parts. */
export interface GhostMenubarMenuContext {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  triggerRegistered: Ref<boolean>
  triggerElement: Ref<HTMLElement | null>
  focusLastOnOpen: Ref<boolean>
  setFocusLastOnOpen: (value: boolean) => void
  setTriggerElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  setContentId: (id: string | null) => void
}

export interface GhostMenubarMenuInternalContext extends GhostMenubarMenuContext {
  openedAtMount: Ref<boolean>
}

export const ghostMenubarMenuContextKey: InjectionKey<GhostMenubarMenuInternalContext> =
  Symbol('ghost-menubar-menu')

/** Radio group context scoped to a menubar menu. */
export interface GhostMenubarMenuRadioGroupContext {
  readonly selectedValue: Ref<string | undefined>
  disabled: ComputedRef<boolean>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isItemDisabled: (value: string) => boolean
}

export const ghostMenubarMenuRadioGroupContextKey: InjectionKey<GhostMenubarMenuRadioGroupContext> =
  Symbol('ghost-menubar-menu-radio-group')

/** Per-menu registration tracked by the menubar root. */
export interface GhostMenubarMenuRegistration {
  triggerElement: Ref<HTMLElement | null>
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
}

/** Menubar root coordination context. */
export interface GhostMenubarContext {
  registerMenu: (id: symbol, entry: GhostMenubarMenuRegistration) => void
  unregisterMenu: (id: symbol) => void
  navigateAdjacentFromTrigger: (
    currentTrigger: HTMLElement,
    key: 'ArrowLeft' | 'ArrowRight',
  ) => void
  closeAllExcept: (exceptId: symbol | null) => void
  getMenubarElement: () => HTMLElement | null
}

export const ghostMenubarContextKey: InjectionKey<GhostMenubarContext> =
  Symbol('ghost-menubar')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so wrappers with a `display:
 * contents` scope resolve to their inner control).
 */
export function resolveMenubarHtmlElement(target: unknown): HTMLElement | null {
  if (typeof HTMLElement === 'undefined') {
    return null
  }
  if (target instanceof HTMLElement) {
    return target
  }
  if (typeof target === 'object' && target !== null) {
    if ('element' in target && target.element instanceof HTMLElement) {
      return target.element
    }
    if ('$el' in target && target.$el instanceof HTMLElement) {
      return target.$el
    }
  }
  return null
}
