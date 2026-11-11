/**
 * Public Vue package entry point. Named ESM exports are the primary API.
 * Component exports still require an approved specification; these primitives
 * are the shared id and model contracts those components will use.
 */
export { useSlId } from './use-sl-id'
export {
  useControllableState,
  type UseControllableStateOptions,
} from './use-controllable-state'
