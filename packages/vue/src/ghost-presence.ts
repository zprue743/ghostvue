import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

/**
 * Presence lifecycle phase. `'exiting'` means the surface is logically closed
 * but its DOM stays mounted while its own CSS exit motion runs.
 */
export type GhostPresencePhase = 'closed' | 'open' | 'exiting'

/**
 * Value written to the surface's `data-state` hook. `'closed'` covers both the
 * `'exiting'` and `'closed'` phases, so exit CSS targets `[data-state='closed']`.
 */
export type GhostPresenceDataState = 'open' | 'closed'

/** Options for {@link useGhostPresence}. */
export interface UseGhostPresenceOptions {
  /** Logical open state (`true` while open, `false` when logically closed). */
  present: MaybeRefOrGetter<boolean>
  /**
   * Host element whose own CSS transitions/animations gate DOM removal during
   * the `exiting` phase. Optional when binding `setElement` as a template ref.
   */
  element?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /**
   * Skips exit retention when `true` (for example `disableAnimation` or an
   * anchored overlay closed before initial positioning completed).
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Invoked once after an `exiting` surface finishes its exit motion and flips
   * `isPresent` to `false`. Never called when an exit is interrupted by reopen
   * or aborted by owner component unmount.
   */
  onExitComplete?: () => void
}

/** Reactive state returned by {@link useGhostPresence}. */
export interface UseGhostPresenceReturn {
  /** `true` while `present` is `true` or while `phase` is `'exiting'`. */
  isPresent: ComputedRef<boolean>
  /** Current lifecycle phase: `'closed'`, `'open'`, or `'exiting'`. */
  phase: Readonly<Ref<GhostPresencePhase>>
  /** `'open'` when logically open; `'closed'` during `'exiting'` and `'closed'`. */
  dataState: ComputedRef<GhostPresenceDataState>
  /** `true` only while `phase` is `'exiting'`. */
  isExiting: ComputedRef<boolean>
  /**
   * Template-ref setter accepting a raw `Element`, a component instance exposing
   * `{ element: HTMLElement | null }` or `$el`, or `null`. Used when `options.element`
   * is not passed directly.
   */
  setElement: (target: unknown) => void
}

/** Props for the renderless {@link GhostPresence} component. */
export interface GhostPresenceProps {
  /**
   * Logical open/mounted state. When `true`, mounts the default slot; when
   * `false`, transitions through `exiting` before unmount.
   */
  present: boolean
  /**
   * When `true`, bypasses exit waiting and unmounts immediately when `present`
   * turns `false`.
   * @default false
   */
  disabled?: boolean
}

/** Props passed to the {@link GhostPresence} default slot. */
export interface GhostPresenceSlotProps {
  /** Logical `present` value passed to the component. */
  present: boolean
  /** Current lifecycle phase. */
  phase: GhostPresencePhase
  /** Value to bind as `data-state` on a surface that binds `setElement` manually. */
  state: GhostPresenceDataState
  /** `true` while the exit motion runs; bind `:inert="exiting || undefined"` when binding manually. */
  exiting: boolean
  /** Template-ref setter for the animated surface when the slot is not a single element. */
  setElement: (target: unknown) => void
}
