import type { ComputedRef, InjectionKey } from 'vue'

/** Props for {@link GhostTooltipProvider}. */
export interface GhostTooltipProviderProps {
  /**
   * Default open delay for descendant {@link GhostTooltip} roots that omit
   * their own `delayDuration`.
   * @default 700
   */
  delayDuration?: number
  /**
   * Milliseconds after a descendant tooltip closes during which the next
   * pointer-driven show may skip the open delay.
   * @default 300
   */
  skipDelayDuration?: number
}

/** Injection context shared by {@link GhostTooltipProvider} descendants. */
export interface GhostTooltipProviderContext {
  /** Provider default `delayDuration`. */
  delayDuration: ComputedRef<number>
  /** Provider `skipDelayDuration` window. */
  skipDelayDuration: ComputedRef<number>
  /**
   * Resolves the open delay for one tooltip instance.
   *
   * @param tooltipDelay - Per-root `delayDuration`, or `undefined` to inherit
   *   the provider default.
   * @param viaPointer - When `false`, skip-delay is never applied so keyboard
   *   focus timing stays per-root.
   */
  resolveOpenDelay: (
    tooltipDelay: number | undefined,
    viaPointer: boolean,
  ) => number
  /** Called when a descendant tooltip transitions to open. */
  onTooltipDidOpen: () => void
  /** Called when a descendant tooltip transitions to closed. */
  onTooltipDidClose: () => void
}

export const ghostTooltipProviderContextKey: InjectionKey<GhostTooltipProviderContext> =
  Symbol('ghost-tooltip-provider')
