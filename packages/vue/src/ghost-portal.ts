/** Target CSS selector, DOM element, or `null` when unavailable. */
export type GhostPortalTarget = string | Element | null

/** Props for the {@link GhostPortal} component. */
export interface GhostPortalProps {
  /**
   * Target CSS selector or DOM element to teleport children into.
   * @default 'body'
   */
  to?: GhostPortalTarget
  /**
   * Render slot content inline instead of teleporting.
   * @default false
   */
  disabled?: boolean
  /**
   * Defer target lookup until after the current mount or update cycle so
   * targets rendered later in the same tree can be found.
   * @default false
   */
  defer?: boolean
}
