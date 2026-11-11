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
