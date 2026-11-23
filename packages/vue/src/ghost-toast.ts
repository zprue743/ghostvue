import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue'

/** Store id of one toast. Generated ids look like `${storeKey}:auto:${n}`. */
export type GhostToastId = string

/**
 * Visual tone hook. `'error'` toasts always persist until dismissed. It is not
 * an ARIA role: urgency of the announcement is set by {@link GhostToastUrgency}.
 */
export type GhostToastType = 'default' | 'error'

/**
 * Which live region announces the toast when it becomes visible. Only
 * `'urgent'` uses the assertive (`role="alert"`) region.
 */
export type GhostToastUrgency = 'default' | 'urgent'

/** Why an auto-dismiss timer is paused. Reasons compose; all must clear to resume. */
export type GhostToastPauseReason = 'hover' | 'focus' | 'hidden'

/** Lifecycle state of a record that is still in the store. */
export type GhostToastState = 'queued' | 'visible'

/** Optional action rendered by {@link GhostToastAction}. */
export interface GhostToastActionOptions {
  /** Visible text of the action button. */
  label: string
  /**
   * Runs in the click's user activation. The store does not await it and does
   * not dismiss the toast afterwards; call `dismiss(id)` when that is wanted.
   */
  onClick: () => void
}

/** Options accepted by `toast()`. */
export interface GhostToastOptions {
  /**
   * Stable id for `update` and `dismiss`. Omit it to get a generated id. Reusing
   * the id of a toast that is still in the store updates it in place.
   */
  id?: GhostToastId
  /** @default 'default' */
  type?: GhostToastType
  /** @default 'default' */
  urgency?: GhostToastUrgency
  /**
   * Auto-dismiss override for informational toasts (no `action`, not
   * `type: 'error'`). `null` or `0` persists; a positive number is
   * milliseconds. Ignored, with a development warning, on persisting toasts.
   */
  duration?: number | null
  /** Primary message. Required and non-empty after trimming. */
  title: string
  /** Optional supporting text, shown and announced after the title. */
  description?: string
  /** Optional action. A toast with an action persists until dismissed. */
  action?: GhostToastActionOptions
  /** Called once when the toast leaves the store, for any reason. */
  onDismiss?: () => void
}

/**
 * Patch accepted by `update()`. Omitted fields keep their current value; pass
 * `undefined` explicitly to clear `description`, `action`, `duration`, or
 * `onDismiss`.
 */
export interface GhostToastUpdateOptions extends Partial<
  Omit<GhostToastOptions, 'id'>
> {
  /**
   * When `true` and the toast is visible, announce the merged title and
   * description again through the region its urgency selects.
   * @default false
   */
  announceUpdate?: boolean
}

/** Read model of one toast. Snapshots are replaced, never mutated. */
export interface GhostToastRecord {
  readonly id: GhostToastId
  readonly type: GhostToastType
  readonly urgency: GhostToastUrgency
  readonly title: string
  readonly description: string | undefined
  readonly action: GhostToastActionOptions | undefined
  /** Resolved auto-dismiss interval in milliseconds, or `null` when it persists. */
  readonly duration: number | null
  /**
   * Milliseconds left when the countdown last started, resumed, or paused;
   * `null` when the toast persists.
   */
  readonly remainingMs: number | null
  /** Active pause reasons, for debugging and advanced rendering. */
  readonly pauseReasons: readonly GhostToastPauseReason[]
  readonly state: GhostToastState
}

/** Defaults merged into every `toast()` call from one `useGhostToast` instance. */
export type UseGhostToastOptions = Partial<Omit<GhostToastOptions, 'id'>>

/** Return value of `useGhostToast()`. */
export interface UseGhostToastReturn {
  /** Visible toasts only, oldest first (index `0` is the front of the stack). */
  toasts: Readonly<Ref<readonly GhostToastRecord[]>>
  /** Creates a toast, or updates the record with the same `id`. Returns the id. */
  toast: (options: GhostToastOptions) => GhostToastId
  /** Merges a patch into a queued or visible toast. No-op for an unknown id. */
  update: (id: GhostToastId, patch: GhostToastUpdateOptions) => void
  /** Removes a toast; a freed visible slot promotes the oldest waiting one. */
  dismiss: (id: GhostToastId) => void
  /** Removes every visible and waiting toast and cancels their timers. */
  dismissAll: () => void
}

/** Props for {@link GhostToastProvider}. */
export interface GhostToastProviderProps {
  /**
   * Default auto-dismiss interval for informational toasts. `0` persists.
   * Non-finite or negative values warn in development and use `8000`.
   * @default 8000
   */
  duration?: number
  /**
   * Maximum number of visible toasts; later toasts wait in FIFO order.
   * Values that are not a finite integer `>= 1` warn and use `3`.
   * @default 3
   */
  limit?: number
  /**
   * Accessible name of the viewport region.
   * @default 'Notifications'
   */
  label?: string
}

/** Host element of {@link GhostToastViewport}. */
export type GhostToastViewportElement = 'div' | 'section'

/** Props for {@link GhostToastViewport}. */
export interface GhostToastViewportProps {
  /**
   * Host element. Use `section` when the region should be a landmark.
   * @default 'div'
   */
  as?: GhostToastViewportElement
  /**
   * Teleport the region and both announcers to `document.body` after mount.
   * @default true
   */
  portal?: boolean
}

/** Slot props of the {@link GhostToastViewport} `default` slot. */
export interface GhostToastViewportSlotProps {
  /** Visible toasts, oldest first. */
  toasts: readonly GhostToastRecord[]
  dismiss: (id: GhostToastId) => void
}

/** Slot props of the {@link GhostToastViewport} `toast` slot. */
export interface GhostToastViewportItemSlotProps {
  toast: GhostToastRecord
  dismiss: (id: GhostToastId) => void
}

/** Props for {@link GhostToast}. */
export interface GhostToastProps {
  /** Record to render, usually one item of the viewport's `toasts`. */
  toast: GhostToastRecord
}

/** Slot props of the {@link GhostToast} `default` slot. */
export interface GhostToastSlotProps {
  toast: GhostToastRecord
  /** Dismisses this toast. */
  dismiss: () => void
}

/** Template ref of {@link GhostToastViewport}. */
export interface GhostToastViewportExposed {
  /** Region host after mount. */
  readonly element: HTMLElement | null
}

/** Template ref of {@link GhostToast}, {@link GhostToastTitle}, and {@link GhostToastDescription}. */
export interface GhostToastExposed {
  readonly element: HTMLElement | null
}

/** Template ref of {@link GhostToastTitle}. */
export type GhostToastTitleExposed = GhostToastExposed

/** Template ref of {@link GhostToastDescription}. */
export type GhostToastDescriptionExposed = GhostToastExposed

/** Template ref of {@link GhostToastAction} and {@link GhostToastClose}. */
export interface GhostToastActionExposed {
  readonly element: HTMLButtonElement | null
  focus: (options?: FocusOptions) => void
  blur: () => void
}

/** Template ref of {@link GhostToastClose}. */
export type GhostToastCloseExposed = GhostToastActionExposed

/** One announcement. The key changes on every write so identical text is re-announced. */
export interface GhostToastAnnouncement {
  readonly key: number
  readonly text: string
}

/**
 * Injection context of {@link GhostToastProvider}. Exported for advanced
 * composition and tests; `useGhostToast()` is the supported entry point.
 */
export interface GhostToastProviderContext {
  /** Same API as `useGhostToast()` without per-instance defaults. */
  api: UseGhostToastReturn
  /** Viewport region name from the provider `label`. */
  label: ComputedRef<string>
  /** Polite (`role="status"`) announcement. */
  politeAnnouncement: Readonly<ShallowRef<GhostToastAnnouncement>>
  /** Assertive (`role="alert"`) announcement. */
  assertiveAnnouncement: Readonly<ShallowRef<GhostToastAnnouncement>>
  /**
   * Registers a mounted viewport. Waiting toasts are promoted and timers run
   * only while at least one viewport is attached. Returns the detach function.
   */
  attachViewport: () => () => void
  /** Adds or removes a hover or focus pause reason for one toast. */
  setPaused: (
    id: GhostToastId,
    reason: Exclude<GhostToastPauseReason, 'hidden'>,
    paused: boolean,
  ) => void
}

export const ghostToastProviderContextKey: InjectionKey<GhostToastProviderContext> =
  Symbol('ghost-toast-provider')

/** @internal Viewport context used by `GhostToast` for focus return. */
export interface GhostToastViewportContext {
  /** Returns focus to where it was before it entered the region, if possible. */
  restoreFocus: () => void
}

/** @internal */
export const ghostToastViewportContextKey: InjectionKey<GhostToastViewportContext> =
  Symbol('ghost-toast-viewport')

/** @internal Per-toast context used by the toast parts. */
export interface GhostToastItemContext {
  toast: ComputedRef<GhostToastRecord>
  dismiss: () => void
}

/** @internal */
export const ghostToastItemContextKey: InjectionKey<GhostToastItemContext> =
  Symbol('ghost-toast-item')
