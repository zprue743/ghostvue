/**
 * Public Vue package entry point. Named ESM exports are the primary API.
 */
export { useSlId } from './use-sl-id'
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
export { default as SlButton } from './SlButton.vue'
export { useSlButton, type SlButtonRootProps } from './use-sl-button'
export type {
  SlButtonExposed,
  SlButtonProps,
  SlButtonType,
  UseSlButtonOptions,
} from './sl-button'
export { default as SlInteractiveSurface } from './SlInteractiveSurface.vue'
export {
  useSlInteractiveSurface,
  type SlInteractiveSurfaceRootProps,
} from './use-sl-interactive-surface'
export type {
  InteractiveEffect,
  InteractiveStateAttribute,
  InteractiveSurfaceElement,
  InteractiveSurfaceState,
  SlInteractiveSurfaceExposed,
  SlInteractiveSurfaceProps,
  UseSlInteractiveSurfaceOptions,
} from './sl-interactive-surface'
export { default as SlVisuallyHidden } from './SlVisuallyHidden.vue'
export {
  useSlVisuallyHidden,
  type SlVisuallyHiddenRootProps,
} from './use-sl-visually-hidden'
export type {
  SlVisuallyHiddenElement,
  SlVisuallyHiddenProps,
  UseSlVisuallyHiddenOptions,
} from './sl-visually-hidden'
