import type { Placement, ReferenceElement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for {@link GhostContextMenuTrigger}. */
export type GhostContextMenuTriggerElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuContent}. */
export type GhostContextMenuContentElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuItem}. */
export type GhostContextMenuItemElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuGroup}. */
export type GhostContextMenuGroupElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuLabel}. */
export type GhostContextMenuLabelElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuSeparator}. */
export type GhostContextMenuSeparatorElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuCheckboxItem}. */
export type GhostContextMenuCheckboxItemElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuRadioGroup}. */
export type GhostContextMenuRadioGroupElement = string | Component

/** Valid `as` targets for {@link GhostContextMenuRadioItem}. */
export type GhostContextMenuRadioItemElement = string | Component

/** Supported floating placements relative to the pointer anchor. */
export type GhostContextMenuPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostContextMenuStrategy = Strategy

/** Viewport/boundary padding accepted by flip and shift options. */
export type GhostContextMenuPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between anchor and menu content. */
export type GhostContextMenuOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostContextMenuContent}. */
export interface GhostContextMenuFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostContextMenuPlacement[]
  padding?: GhostContextMenuPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostContextMenuContent}. */
export interface GhostContextMenuShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostContextMenuPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostContextMenu} root provider component. */
export interface GhostContextMenuProps {
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

/** Props passed to the {@link GhostContextMenu} default slot. */
export interface GhostContextMenuSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostContextMenuTrigger}. */
export interface GhostContextMenuTriggerProps {
  /**
   * Tag name or component wrapping the context target.
   * @default 'span'
   */
  as?: GhostContextMenuTriggerElement
  /**
   * Suppresses open gestures and keyboard shortcuts.
   * @default false
   */
  disabled?: boolean
  /**
   * Milliseconds before touch/pen long-press opens the menu.
   * @default 500
   */
  longPressDelay?: number
}

/** Props for {@link GhostContextMenuContent}. */
export interface GhostContextMenuContentProps {
  /**
   * Tag name or component rendered for the menu surface.
   * @default 'div'
   */
  as?: GhostContextMenuContentElement
  /** Preferred placement relative to the pointer anchor. */
  placement?: GhostContextMenuPlacement
  offset?: GhostContextMenuOffsetOptions | boolean | undefined
  flip?: boolean | GhostContextMenuFlipOptions
  shift?: boolean | GhostContextMenuShiftOptions
  strategy?: GhostContextMenuStrategy
  portal?: boolean
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostContextMenuItem}. */
export interface GhostContextMenuItemProps {
  as?: GhostContextMenuItemElement
  disabled?: boolean
}

/** Props for {@link GhostContextMenuGroup}. */
export interface GhostContextMenuGroupProps {
  as?: GhostContextMenuGroupElement
}

/** Props for {@link GhostContextMenuLabel}. */
export interface GhostContextMenuLabelProps {
  as?: GhostContextMenuLabelElement
}

/** Props for {@link GhostContextMenuSeparator}. */
export interface GhostContextMenuSeparatorProps {
  as?: GhostContextMenuSeparatorElement
  decorative?: boolean
}

/** Props for {@link GhostContextMenuCheckboxItem}. */
export interface GhostContextMenuCheckboxItemProps {
  as?: GhostContextMenuCheckboxItemElement
  checked?: boolean | undefined
  defaultChecked?: boolean
  disabled?: boolean
}

/** Props for {@link GhostContextMenuRadioGroup}. */
export interface GhostContextMenuRadioGroupProps {
  as?: GhostContextMenuRadioGroupElement
  modelValue?: string | undefined
  defaultValue?: string | undefined
  disabled?: boolean
}

/** Props for {@link GhostContextMenuRadioItem}. */
export interface GhostContextMenuRadioItemProps {
  as?: GhostContextMenuRadioItemElement
  value: string
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostContextMenuTrigger}. */
export interface GhostContextMenuTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostContextMenuContent}. */
export interface GhostContextMenuContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostContextMenuItem}. */
export interface GhostContextMenuItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostContextMenuCheckboxItem}. */
export interface GhostContextMenuCheckboxItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostContextMenuRadioItem}. */
export interface GhostContextMenuRadioItemExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostContextMenu}. */
export interface UseGhostContextMenuOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostContextMenu}. */
export interface UseGhostContextMenuReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Pointer coordinates used for the virtual floating anchor. */
export interface GhostContextMenuPointerPosition {
  x: number
  y: number
}

/** Internal context shared between context menu parts. */
export interface GhostContextMenuContext {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  openAtPointer: (x: number, y: number) => void
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  triggerElement: Ref<HTMLElement | null>
  virtualReference: ComputedRef<ReferenceElement>
  setTriggerElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setContentId: (id: string | null) => void
}

export const ghostContextMenuContextKey: InjectionKey<GhostContextMenuContext> =
  Symbol('ghost-context-menu')

/** Radio group context scoped to a context menu. */
export interface GhostContextMenuRadioGroupContext {
  readonly selectedValue: Ref<string | undefined>
  disabled: ComputedRef<boolean>
  select: (value: string) => void
  isSelected: (value: string) => boolean
  isItemDisabled: (value: string) => boolean
}

export const ghostContextMenuRadioGroupContextKey: InjectionKey<GhostContextMenuRadioGroupContext> =
  Symbol('ghost-context-menu-radio-group')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveContextMenuHtmlElement(
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

/** Builds a zero-size virtual reference for {@link useFloating}. */
export function createContextMenuVirtualReference(
  getPosition: () => GhostContextMenuPointerPosition,
): ReferenceElement {
  return {
    getBoundingClientRect() {
      const { x, y } = getPosition()
      return {
        width: 0,
        height: 0,
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
      }
    },
  }
}
