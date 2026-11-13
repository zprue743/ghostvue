/**
 * Public Vue package entry point. Named ESM exports are the primary API.
 */
export { useGhostId } from './use-ghost-id'
export {
  useControllableState,
  type UseControllableStateOptions,
} from './use-controllable-state'
export { useFocusScope, type UseFocusScopeOptions } from './use-focus-scope'
export {
  useRovingFocus,
  type RovingOrientation,
  type TextDirection,
  type UseRovingFocusOptions,
} from './use-roving-focus'
export { default as GhostButton } from './GhostButton.vue'
export { useGhostButton, type GhostButtonRootProps } from './use-ghost-button'
export type {
  GhostButtonExposed,
  GhostButtonProps,
  GhostButtonType,
  UseGhostButtonOptions,
} from './ghost-button'
export { default as GhostInteractiveSurface } from './GhostInteractiveSurface.vue'
export {
  useGhostInteractiveSurface,
  type GhostInteractiveSurfaceRootProps,
} from './use-ghost-interactive-surface'
export type {
  InteractiveEffect,
  InteractiveStateAttribute,
  InteractiveSurfaceElement,
  InteractiveSurfaceState,
  GhostInteractiveSurfaceExposed,
  GhostInteractiveSurfaceProps,
  UseGhostInteractiveSurfaceOptions,
} from './ghost-interactive-surface'
export { default as GhostVisuallyHidden } from './GhostVisuallyHidden.vue'
export {
  useGhostVisuallyHidden,
  type GhostVisuallyHiddenRootProps,
} from './use-ghost-visually-hidden'
export type {
  GhostVisuallyHiddenElement,
  GhostVisuallyHiddenProps,
  UseGhostVisuallyHiddenOptions,
} from './ghost-visually-hidden'
export {
  useDismissableLayer,
  type DismissableLayerIgnore,
  type DismissableLayerTarget,
  type DismissReason,
  type UseDismissableLayerOptions,
} from './use-dismissable-layer'
export {
  useFloating,
  type UseFloatingOptions,
  type UseFloatingReturn,
} from './use-floating'
export { default as GhostPortal } from './GhostPortal.vue'
export type { GhostPortalProps, GhostPortalTarget } from './ghost-portal'
export { default as GhostPopover } from './GhostPopover.vue'
export { default as GhostPopoverTrigger } from './GhostPopoverTrigger.vue'
export { default as GhostPopoverContent } from './GhostPopoverContent.vue'
export { default as GhostPopoverClose } from './GhostPopoverClose.vue'
export { useGhostPopover } from './use-ghost-popover'
export type {
  GhostPopoverCloseElement,
  GhostPopoverCloseExposed,
  GhostPopoverCloseProps,
  GhostPopoverContentElement,
  GhostPopoverContentExposed,
  GhostPopoverContentProps,
  GhostPopoverContext,
  GhostPopoverFlipOptions,
  GhostPopoverOffsetOptions,
  GhostPopoverPadding,
  GhostPopoverPlacement,
  GhostPopoverProps,
  GhostPopoverShiftOptions,
  GhostPopoverSlotProps,
  GhostPopoverStrategy,
  GhostPopoverTriggerElement,
  GhostPopoverTriggerExposed,
  GhostPopoverTriggerProps,
  UseGhostPopoverOptions,
  UseGhostPopoverReturn,
} from './ghost-popover'
