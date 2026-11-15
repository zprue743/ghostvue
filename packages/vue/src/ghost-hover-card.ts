import type { Placement, Strategy } from '@floating-ui/dom'
import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  Ref,
} from 'vue'

import type { GhostPortalTarget } from './ghost-portal'
import { resolvePopoverHtmlElement } from './ghost-popover'

/** Valid `as` targets for {@link GhostHoverCardTrigger}. */
export type GhostHoverCardTriggerElement = string | Component

/** Valid `as` targets for {@link GhostHoverCardContent}. */
export type GhostHoverCardContentElement = string | Component

/** Supported floating placements relative to the trigger anchor. */
export type GhostHoverCardPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostHoverCardStrategy = Strategy

/** Viewport/boundary padding accepted by hover-card flip and shift options. */
export type GhostHoverCardPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between trigger and hover-card content. */
export type GhostHoverCardOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostHoverCardContent}. */
export interface GhostHoverCardFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostHoverCardPlacement[]
  padding?: GhostHoverCardPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostHoverCardContent}. */
export interface GhostHoverCardShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostHoverCardPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostHoverCard} root provider component. */
export interface GhostHoverCardProps {
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
  /**
   * Milliseconds before showing after hover or focus begins.
   * @default 700
   */
  openDelay?: number
  /**
   * Milliseconds before hiding after hover/focus leaves the trigger and content.
   * @default 300
   */
  closeDelay?: number
  /**
   * When `true`, `Escape` dismisses the open card via `useDismissableLayer`.
   * @default true
   */
  closeOnEscape?: boolean
}

/** Props passed to the {@link GhostHoverCard} default slot. */
export interface GhostHoverCardSlotProps {
  open: boolean
  close: () => void
}

/** Props for {@link GhostHoverCardTrigger}. */
export interface GhostHoverCardTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostHoverCardTriggerElement
  /**
   * Prevents scheduling show on hover or focus when `true`.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostHoverCardContent}. */
export interface GhostHoverCardContentProps {
  /**
   * Tag name or component rendered for the card surface.
   * @default 'div'
   */
  as?: GhostHoverCardContentElement
  /**
   * Preferred placement relative to the trigger.
   * @default 'bottom'
   */
  placement?: GhostHoverCardPlacement
  /**
   * Distance or axis offsets passed to `useFloating`.
   * @default undefined
   */
  offset?: GhostHoverCardOffsetOptions | boolean | undefined
  /**
   * Flip to an opposite side when overflowing the viewport or boundary.
   * @default true
   */
  flip?: boolean | GhostHoverCardFlipOptions
  /**
   * Shift along the cross axis to keep the card in view.
   * @default true
   */
  shift?: boolean | GhostHoverCardShiftOptions
  /**
   * CSS positioning strategy passed to `useFloating`.
   * @default 'absolute'
   */
  strategy?: GhostHoverCardStrategy
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

/** Methods and state exposed by a template ref to {@link GhostHoverCardTrigger}. */
export interface GhostHoverCardTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostHoverCardContent}. */
export interface GhostHoverCardContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostHoverCard}. */
export interface UseGhostHoverCardOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostHoverCard}. */
export interface UseGhostHoverCardReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between `GhostHoverCard` parts. */
export interface GhostHoverCardContext {
  isOpen: Ref<boolean>
  closeDelay: ComputedRef<number>
  closeOnEscape: ComputedRef<boolean>
  cancelClose: () => void
  hideImmediate: () => void
  notifyTriggerPointerEnter: () => void
  notifyTriggerPointerLeave: () => void
  notifyTriggerFocusIn: () => void
  notifyTriggerFocusOut: (relatedTarget: EventTarget | null) => void
  notifyContentPointerEnter: () => void
  notifyContentPointerLeave: () => void
  notifyContentFocusIn: () => void
  notifyContentFocusOut: (relatedTarget: EventTarget | null) => void
  defaultTriggerId: ComputedRef<string>
  defaultContentId: ComputedRef<string>
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
  triggerRegistered: Ref<boolean>
  triggerElement: Ref<HTMLElement | null>
  contentElement: Ref<HTMLElement | null>
  setTriggerElement: (element: HTMLElement | null) => void
  setContentElement: (element: HTMLElement | null) => void
  setTriggerId: (id: string | null) => void
  setTriggerRegistered: (registered: boolean) => void
  setContentId: (id: string | null) => void
}

export const ghostHoverCardContextKey: InjectionKey<GhostHoverCardContext> =
  Symbol('ghost-hover-card')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveHoverCardHtmlElement(
  target: unknown,
): HTMLElement | null {
  return resolvePopoverHtmlElement(target)
}

/**
 * Returns whether `relatedTarget` is contained by the trigger or card content.
 */
export function hoverCardFocusStaysInside(
  relatedTarget: EventTarget | null,
  trigger: HTMLElement | null,
  content: HTMLElement | null,
): boolean {
  if (!(relatedTarget instanceof Node)) {
    return false
  }
  if (trigger?.contains(relatedTarget)) {
    return true
  }
  if (content?.contains(relatedTarget)) {
    return true
  }
  return false
}
