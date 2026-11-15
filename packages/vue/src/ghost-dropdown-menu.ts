import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for {@link GhostDropdownMenuTrigger}. */
export type GhostDropdownMenuTriggerElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuContent}. */
export type GhostDropdownMenuContentElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuItem}. */
export type GhostDropdownMenuItemElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuGroup}. */
export type GhostDropdownMenuGroupElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuLabel}. */
export type GhostDropdownMenuLabelElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuSeparator}. */
export type GhostDropdownMenuSeparatorElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuCheckboxItem}. */
export type GhostDropdownMenuCheckboxItemElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuRadioGroup}. */
export type GhostDropdownMenuRadioGroupElement = string | Component

/** Valid `as` targets for {@link GhostDropdownMenuRadioItem}. */
export type GhostDropdownMenuRadioItemElement = string | Component

/** Supported floating placements relative to the trigger anchor. */
export type GhostDropdownMenuPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostDropdownMenuStrategy = Strategy

/** Viewport/boundary padding accepted by flip and shift options. */
export type GhostDropdownMenuPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between trigger and menu content. */
export type GhostDropdownMenuOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostDropdownMenuContent}. */
export interface GhostDropdownMenuFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostDropdownMenuPlacement[]
  padding?: GhostDropdownMenuPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostDropdownMenuContent}. */
export interface GhostDropdownMenuShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostDropdownMenuPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostDropdownMenu} root provider component. */
export interface GhostDropdownMenuProps {
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

/** Props passed to the {@link GhostDropdownMenu} default slot. */
export interface GhostDropdownMenuSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostDropdownMenuTrigger}. */
export interface GhostDropdownMenuTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostDropdownMenuTriggerElement
  /**
   * Disables toggling on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostDropdownMenuContent}. */
export interface GhostDropdownMenuContentProps {
  /**
   * Tag name or component rendered for the menu surface.
   * @default 'div'
   */
  as?: GhostDropdownMenuContentElement
  /** Preferred placement relative to the trigger. */
  placement?: GhostDropdownMenuPlacement
  offset?: GhostDropdownMenuOffsetOptions | boolean | undefined
  flip?: boolean | GhostDropdownMenuFlipOptions
  shift?: boolean | GhostDropdownMenuShiftOptions
  strategy?: GhostDropdownMenuStrategy
  portal?: boolean
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostDropdownMenuItem}. */
export interface GhostDropdownMenuItemProps {
  as?: GhostDropdownMenuItemElement
  disabled?: boolean
}

/** Props for {@link GhostDropdownMenuGroup}. */
export interface GhostDropdownMenuGroupProps {
  as?: GhostDropdownMenuGroupElement
}

/** Props for {@link GhostDropdownMenuLabel}. */
export interface GhostDropdownMenuLabelProps {
  as?: GhostDropdownMenuLabelElement
}

/** Props for {@link GhostDropdownMenuSeparator}. */
export interface GhostDropdownMenuSeparatorProps {
  as?: GhostDropdownMenuSeparatorElement
  decorative?: boolean
}

/** Props for {@link GhostDropdownMenuCheckboxItem}. */
export interface GhostDropdownMenuCheckboxItemProps {
  as?: GhostDropdownMenuCheckboxItemElement
  checked?: boolean | undefined
  defaultChecked?: boolean
  disabled?: boolean
}

/** Props for {@link GhostDropdownMenuRadioGroup}. */
export interface GhostDropdownMenuRadioGroupProps {
  as?: GhostDropdownMenuRadioGroupElement
  modelValue?: string | undefined
  defaultValue?: string | undefined
  disabled?: boolean
}

/** Props for {@link GhostDropdownMenuRadioItem}. */
export interface GhostDropdownMenuRadioItemProps {
  as?: GhostDropdownMenuRadioItemElement
  value: string
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostDropdownMenuTrigger}. */
export interface GhostDropdownMenuTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDropdownMenuContent}. */
export interface GhostDropdownMenuContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDropdownMenuItem}. */
export interface GhostDropdownMenuItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDropdownMenuCheckboxItem}. */
export interface GhostDropdownMenuCheckboxItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostDropdownMenuRadioItem}. */
export interface GhostDropdownMenuRadioItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostDropdownMenu}. */
export interface UseGhostDropdownMenuOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
  /**
   * Prefix for SSR-safe part IDs (`{namespace}-trigger`, `{namespace}-content`).
   * @default 'ghost-dropdown-menu'
   */
  idNamespace?: string
}

/** Reactive state and helpers returned by {@link useGhostDropdownMenu}. */
export interface UseGhostDropdownMenuReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between dropdown menu parts. */
export interface GhostDropdownMenuContext {
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

export interface GhostDropdownMenuInternalContext extends GhostDropdownMenuContext {
  openedAtMount: Ref<boolean>
}

export const ghostDropdownMenuContextKey: InjectionKey<GhostDropdownMenuInternalContext> =
  Symbol('ghost-dropdown-menu')

/** Radio group context scoped to a menu (items use `menuitemradio`, not native inputs). */
export interface GhostDropdownMenuRadioGroupContext {
  readonly selectedValue: Ref<string | undefined>
  disabled: ComputedRef<boolean>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isItemDisabled: (value: string) => boolean
}

export const ghostDropdownMenuRadioGroupContextKey: InjectionKey<GhostDropdownMenuRadioGroupContext> =
  Symbol('ghost-dropdown-menu-radio-group')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so wrappers with a `display:
 * contents` scope resolve to their inner control).
 */
export function resolveDropdownMenuHtmlElement(
  target: unknown,
): HTMLElement | null {
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
