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

/** Valid `as` targets for {@link GhostTooltipTrigger}. */
export type GhostTooltipTriggerElement = string | Component

/** Valid `as` targets for {@link GhostTooltipContent}. */
export type GhostTooltipContentElement = string | Component

/** Supported floating placements relative to the trigger anchor. */
export type GhostTooltipPlacement = Placement

/** Supported CSS positioning strategies for floating content. */
export type GhostTooltipStrategy = Strategy

/** Viewport/boundary padding accepted by tooltip flip and shift options. */
export type GhostTooltipPadding =
  number | { top?: number; right?: number; bottom?: number; left?: number }

/** Distance or axis offsets between trigger and tooltip content. */
export type GhostTooltipOffsetOptions =
  | number
  | { mainAxis?: number; crossAxis?: number; alignmentAxis?: number | null }

/** Collision flip options for {@link GhostTooltipContent}. */
export interface GhostTooltipFlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  fallbackPlacements?: GhostTooltipPlacement[]
  padding?: GhostTooltipPadding
  boundary?: Element | Element[]
}

/** Collision shift options for {@link GhostTooltipContent}. */
export interface GhostTooltipShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  padding?: GhostTooltipPadding
  boundary?: Element | Element[]
}

/** Props for the {@link GhostTooltip} root provider component. */
export interface GhostTooltipProps {
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
  delayDuration?: number
  /**
   * Milliseconds before hiding after hover/focus ends (WCAG hoverable grace).
   * @default 300
   */
  skipDelayDuration?: number
  /**
   * When `true`, hides immediately on pointer/focus leave.
   * @default false
   */
  disableHoverableContent?: boolean
}

/** Props passed to the {@link GhostTooltip} default slot. */
export interface GhostTooltipSlotProps {
  open: boolean
}

/** Props for {@link GhostTooltipTrigger}. */
export interface GhostTooltipTriggerProps {
  /**
   * Tag name or component rendered for the trigger control.
   * @default 'button'
   */
  as?: GhostTooltipTriggerElement
  /**
   * Prevents scheduling show on hover or focus when `true`.
   * @default false
   */
  disabled?: boolean
}

/** Props for {@link GhostTooltipContent}. */
export interface GhostTooltipContentProps {
  /**
   * Tag name or component rendered for the tooltip surface.
   * @default 'div'
   */
  as?: GhostTooltipContentElement
  /**
   * Preferred placement relative to the trigger.
   * @default 'top'
   */
  placement?: GhostTooltipPlacement
  /**
   * Distance or axis offsets passed to `useFloating`.
   * @default undefined
   */
  offset?: GhostTooltipOffsetOptions | boolean | undefined
  /**
   * Flip to an opposite side when overflowing the viewport or boundary.
   * @default true
   */
  flip?: boolean | GhostTooltipFlipOptions
  /**
   * Shift along the cross axis to keep the tooltip in view.
   * @default true
   */
  shift?: boolean | GhostTooltipShiftOptions
  /**
   * CSS positioning strategy passed to `useFloating`.
   * @default 'absolute'
   */
  strategy?: GhostTooltipStrategy
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

/** Methods and state exposed by a template ref to {@link GhostTooltipTrigger}. */
export interface GhostTooltipTriggerExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Methods and state exposed by a template ref to {@link GhostTooltipContent}. */
export interface GhostTooltipContentExposed {
  readonly element: HTMLElement | null
  focus(options?: FocusOptions): void
  blur(): void
}

/** Options for {@link useGhostTooltip}. */
export interface UseGhostTooltipOptions {
  open?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (open: boolean) => void
}

/** Reactive state and helpers returned by {@link useGhostTooltip}. */
export interface UseGhostTooltipReturn {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  triggerId: ComputedRef<string>
  contentId: ComputedRef<string>
}

/** Internal context shared between `GhostTooltip` parts. */
export interface GhostTooltipContext {
  isOpen: Ref<boolean>
  delayDuration: ComputedRef<number>
  skipDelayDuration: ComputedRef<number>
  disableHoverableContent: ComputedRef<boolean>
  scheduleShow: () => void
  scheduleHide: () => void
  hideImmediate: () => void
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

export const ghostTooltipContextKey: InjectionKey<GhostTooltipContext> =
  Symbol('ghost-tooltip')

/**
 * Resolves a DOM element from either a raw element or a component ref
 * (preferring exposed `.element` over `.$el`).
 */
export function resolveTooltipHtmlElement(target: unknown): HTMLElement | null {
  return resolvePopoverHtmlElement(target)
}
