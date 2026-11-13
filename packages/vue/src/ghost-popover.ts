import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

/** Valid `as` targets for {@link GhostPopoverTrigger}. */
export type GhostPopoverTriggerElement = string | Component

/** Valid `as` targets for {@link GhostPopoverContent}. */
export type GhostPopoverContentElement = string | Component

/** Valid `as` targets for {@link GhostPopoverClose}. */
export type GhostPopoverCloseElement = string | Component

/** Supported floating placements relative to the trigger anchor. */
export type GhostPopoverPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostPopoverStrategy = Strategy

/** Viewport/boundary padding accepted by popover flip and shift options. */
export type GhostPopoverPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between trigger and popover content. */
export type GhostPopoverOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostPopoverContent}. */
export interface GhostPopoverFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostPopoverPlacement[]
  padding?: GhostPopoverPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostPopoverContent}. */
export interface GhostPopoverShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostPopoverPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostPopover} root provider component. */
export interface GhostPopoverProps {
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

/** Props passed to the {@link GhostPopover} default slot. */
export interface GhostPopoverSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostPopoverTrigger}. */
export interface GhostPopoverTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostPopoverTriggerElement
  /**
   * Disables toggling on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostPopoverContent}. */
export interface GhostPopoverContentProps {
  /**
   * Tag name or component rendered for the popover dialog surface.
   * @default 'div'
   */
  as?: GhostPopoverContentElement
  /**
   * Preferred placement relative to the trigger.
   * @default 'bottom'
   */
  placement?: GhostPopoverPlacement
  /**
   * Distance or axis offsets passed to `useFloating`.
   * @default undefined
   */
  offset?: GhostPopoverOffsetOptions | boolean | undefined
  /**
   * Flip to an opposite side when overflowing the viewport or boundary.
   * @default true
   */
  flip?: boolean | GhostPopoverFlipOptions
  /**
   * Shift along the cross axis to keep the popover in view.
   * @default true
   */
  shift?: boolean | GhostPopoverShiftOptions
  /**
   * CSS positioning strategy passed to `useFloating`.
   * @default 'absolute'
   */
  strategy?: GhostPopoverStrategy
  /**
   * Teleport content through {@link GhostPortal} when `true`, or render inline when `false`.
   * @default true
   */
  portal?: boolean
  /**
   * Teleport target passed to {@link GhostPortal} when `portal` is `true`.
   * @default 'body'
   */
  portalTo?: GhostPortalTarget
}

/** Props for {@link GhostPopoverClose}. */
export interface GhostPopoverCloseProps {
  /**
   * Tag name or component rendered for the close control.
   * @default 'button'
   */
  as?: GhostPopoverCloseElement
  /**
   * Disables closing on click or keyboard activation.
   * @default false
   */
  disabled?: boolean
}

/** Methods and state exposed by a template ref to {@link GhostPopoverTrigger}. */
export interface GhostPopoverTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostPopoverContent}. */
export interface GhostPopoverContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostPopoverClose}. */
export interface GhostPopoverCloseExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostPopover}. */
export interface UseGhostPopoverOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostPopover}. */
export interface UseGhostPopoverReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between `GhostPopover` parts. */
export interface GhostPopoverContext {
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
  setTriggerElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  setContentId: (id: string | null) => void
}

export interface GhostPopoverInternalContext extends GhostPopoverContext {
  openedAtMount: Ref<boolean>
}

export const ghostPopoverContextKey: InjectionKey<GhostPopoverInternalContext> =
  Symbol('ghost-popover')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el` so wrappers like themed
 * `GhostButton` with a `display: contents` scope resolve to their inner control).
 */
export function resolvePopoverHtmlElement(target: unknown): HTMLElement | null {
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
