import {
  inject,
  nextTick,
  shallowRef,
  type MaybeRefOrGetter,
  type ShallowRef,
  toValue,
} from 'vue'

import { logGhostCode } from './dev-codes'
import {
  ghostToastProviderContextKey,
  type GhostToastActionOptions,
  type GhostToastAnnouncement,
  type GhostToastId,
  type GhostToastOptions,
  type GhostToastPauseReason,
  type GhostToastRecord,
  type GhostToastState,
  type GhostToastType,
  type GhostToastUpdateOptions,
  type GhostToastUrgency,
  type UseGhostToastOptions,
  type UseGhostToastReturn,
} from './ghost-toast'

/** Informational auto-dismiss default from the approved spec. */
export const GHOST_TOAST_DEFAULT_DURATION = 8000
/** Default visible window size. */
export const GHOST_TOAST_DEFAULT_LIMIT = 3
/** Development warning threshold for the unbounded waiting queue (T4). */
export const GHOST_TOAST_WAITING_WARNING_THRESHOLD = 20

/** Mutable store entry. Never exposed: consumers read {@link GhostToastRecord} snapshots. */
interface ToastEntry {
  readonly id: GhostToastId
  state: GhostToastState
  type: GhostToastType
  urgency: GhostToastUrgency
  title: string
  description: string | undefined
  action: GhostToastActionOptions | undefined
  /** Raw consumer `duration`, kept so provider default changes re-resolve. */
  durationOption: number | null | undefined
  onDismiss: (() => void) | undefined
  /** Resolved policy; `null` persists. */
  durationMs: number | null
  /** Frozen remaining budget while not counting down. */
  remainingMs: number | null
  /** `Date.now()` deadline while counting down, else `null`. */
  deadline: number | null
  timer: ReturnType<typeof setTimeout> | undefined
  readonly pauses: Set<Exclude<GhostToastPauseReason, 'hidden'>>
}

export interface GhostToastStoreOptions {
  /** Unique per provider; prefixes generated ids. */
  storeKey: string
  duration: MaybeRefOrGetter<number | undefined>
  limit: MaybeRefOrGetter<number | undefined>
  /** `true` while rendering on the server: `toast()` becomes a no-op (T1). */
  isServer: boolean
}

export interface GhostToastStore {
  api: UseGhostToastReturn
  politeAnnouncement: ShallowRef<GhostToastAnnouncement>
  assertiveAnnouncement: ShallowRef<GhostToastAnnouncement>
  attachViewport: () => () => void
  setPaused: (
    id: GhostToastId,
    reason: Exclude<GhostToastPauseReason, 'hidden'>,
    paused: boolean,
  ) => void
  setPageHidden: (hidden: boolean) => void
  /** Re-reads provider `limit` / `duration` after a prop change. */
  refresh: () => void
  /** Provider disposal: clears everything and calls each `onDismiss` once. */
  dispose: () => void
}

function isPersisting(entry: {
  type: GhostToastType
  action: GhostToastActionOptions | undefined
}): 'error' | 'action' | null {
  if (entry.type === 'error') return 'error'
  if (entry.action) return 'action'
  return null
}

/**
 * Resolves the provider `duration` prop: non-finite or negative values warn and
 * fall back to the 8000 ms default.
 */
function resolveProviderDuration(
  value: number | undefined,
  warn = false,
): number {
  if (value === undefined) return GHOST_TOAST_DEFAULT_DURATION
  if (!Number.isFinite(value) || value < 0) {
    if (warn && process.env.NODE_ENV !== 'production') {
      logGhostCode('GHOST008', {
        option: 'GhostToastProvider duration',
        value: String(value),
        expected: 'a finite number >= 0',
        fallback: String(GHOST_TOAST_DEFAULT_DURATION),
      })
    }
    return GHOST_TOAST_DEFAULT_DURATION
  }
  return value
}

function resolveLimit(value: number | undefined, warn = false): number {
  if (value === undefined) return GHOST_TOAST_DEFAULT_LIMIT
  if (!Number.isInteger(value) || value < 1) {
    if (warn && process.env.NODE_ENV !== 'production') {
      logGhostCode('GHOST008', {
        option: 'GhostToastProvider limit',
        value: String(value),
        expected: 'a finite integer >= 1',
        fallback: String(GHOST_TOAST_DEFAULT_LIMIT),
      })
    }
    return GHOST_TOAST_DEFAULT_LIMIT
  }
  return value
}

/**
 * Development check of provider props. The provider runs it when they change;
 * the store resolves the same values silently on every read.
 */
export function validateGhostToastProviderProps(props: {
  duration?: number | undefined
  limit?: number | undefined
}): void {
  resolveProviderDuration(props.duration, true)
  resolveLimit(props.limit, true)
}

/**
 * Creates the provider-scoped toast store. All state lives in this closure, so
 * sibling providers and concurrent SSR requests never share a queue.
 *
 * Invariants:
 * - `entries` is creation order. Visible entries are the oldest promoted ones,
 *   so filtering by state keeps FIFO order for both the stack and the queue.
 * - Promotion and timers only run while a viewport is attached (T1).
 * - Nothing here moves focus.
 */
export function createGhostToastStore(
  options: GhostToastStoreOptions,
): GhostToastStore {
  const autoPrefix = `${options.storeKey}:auto:`
  let autoCounter = 0
  let entries: ToastEntry[] = []
  let viewportCount = 0
  let pageHidden = false
  let waitingWarned = false
  let disposed = false

  const toasts = shallowRef<readonly GhostToastRecord[]>([])
  const politeAnnouncement = shallowRef<GhostToastAnnouncement>({
    key: 0,
    text: '',
  })
  const assertiveAnnouncement = shallowRef<GhostToastAnnouncement>({
    key: 0,
    text: '',
  })
  // Shows in one tick are joined into one atomic string so a burst (for
  // example three toasts flushed on viewport mount) is not reduced to its last
  // message by the single keyed child.
  const openBatches = new Set<ShallowRef<GhostToastAnnouncement>>()

  function now(): number {
    return Date.now()
  }

  function providerDuration(): number {
    return resolveProviderDuration(toValue(options.duration))
  }

  function resolveDuration(entry: ToastEntry): number | null {
    if (isPersisting(entry)) return null
    let explicit = entry.durationOption
    if (
      typeof explicit === 'number' &&
      (!Number.isFinite(explicit) || explicit < 0)
    ) {
      // Warned when the option was set; treated as undefined here.
      explicit = undefined
    }
    if (explicit === null || explicit === 0) return null
    if (explicit !== undefined) return explicit
    const fallback = providerDuration()
    return fallback === 0 ? null : fallback
  }

  function validateDurationOption(
    entry: Pick<ToastEntry, 'id' | 'type' | 'action'>,
    duration: number | null | undefined,
  ): void {
    if (process.env.NODE_ENV === 'production' || duration === undefined) return
    const persisting = isPersisting(entry)
    if (persisting) {
      logGhostCode('GHOST007', {
        id: entry.id,
        reason: persisting === 'error' ? "type: 'error'" : 'action',
      })
      return
    }
    if (
      typeof duration === 'number' &&
      (!Number.isFinite(duration) || duration < 0)
    ) {
      logGhostCode('GHOST008', {
        option: `Toast "${entry.id}" duration`,
        value: String(duration),
        expected: 'null or a finite number >= 0',
        fallback: 'the provider duration',
      })
    }
  }

  function snapshot(entry: ToastEntry): GhostToastRecord {
    const pauseReasons: GhostToastPauseReason[] = [...entry.pauses]
    if (pageHidden) pauseReasons.push('hidden')
    return Object.freeze({
      id: entry.id,
      type: entry.type,
      urgency: entry.urgency,
      title: entry.title,
      description: entry.description,
      action: entry.action,
      duration: entry.durationMs,
      remainingMs: entry.remainingMs,
      pauseReasons: Object.freeze(pauseReasons),
      state: entry.state,
    })
  }

  function commit(): void {
    toasts.value = Object.freeze(
      entries.filter((entry) => entry.state === 'visible').map(snapshot),
    )
  }

  function announce(entry: ToastEntry): void {
    const text = [entry.title, entry.description]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
    if (!text) return
    const region =
      entry.urgency === 'urgent' ? assertiveAnnouncement : politeAnnouncement
    const previous = region.value
    const batched = openBatches.has(region) && previous.text
    region.value = {
      key: previous.key + 1,
      text: batched ? `${previous.text} ${text}` : text,
    }
    if (!openBatches.has(region)) {
      openBatches.add(region)
      void nextTick(() => {
        openBatches.delete(region)
      })
    }
  }

  function isCounting(entry: ToastEntry): boolean {
    return (
      entry.state === 'visible' &&
      viewportCount > 0 &&
      !pageHidden &&
      entry.pauses.size === 0 &&
      entry.remainingMs !== null
    )
  }

  /** Freezes the remaining budget and cancels the timer. */
  function stopTimer(entry: ToastEntry): void {
    if (entry.timer !== undefined) {
      clearTimeout(entry.timer)
      entry.timer = undefined
    }
    if (entry.deadline !== null && entry.remainingMs !== null) {
      entry.remainingMs = Math.max(0, entry.deadline - now())
    }
    entry.deadline = null
  }

  /** Starts or stops the countdown so it matches {@link isCounting}. */
  function syncTimer(entry: ToastEntry): void {
    const counting = isCounting(entry)
    if (!counting) {
      stopTimer(entry)
      return
    }
    if (entry.deadline !== null) return
    const remaining = entry.remainingMs ?? 0
    entry.deadline = now() + remaining
    entry.timer = setTimeout(() => {
      entry.timer = undefined
      entry.deadline = null
      entry.remainingMs = 0
      dismiss(entry.id)
    }, remaining)
  }

  function warnWaiting(): void {
    if (process.env.NODE_ENV === 'production') return
    const waiting = entries.filter((entry) => entry.state === 'queued').length
    if (waiting > GHOST_TOAST_WAITING_WARNING_THRESHOLD) {
      // Once per crossing, so a runaway loop warns without flooding.
      if (!waitingWarned) {
        waitingWarned = true
        logGhostCode('GHOST010', { count: String(waiting) })
      }
    } else {
      waitingWarned = false
    }
  }

  /** Fills free visible slots from the waiting queue, oldest first. */
  function promote(): void {
    if (viewportCount === 0) return
    const limit = resolveLimit(toValue(options.limit))
    let visible = entries.filter((entry) => entry.state === 'visible').length
    for (const entry of entries) {
      if (visible >= limit) break
      if (entry.state !== 'queued') continue
      entry.state = 'visible'
      visible += 1
      // Waiting time never consumes the auto-dismiss budget.
      entry.remainingMs = entry.durationMs
      entry.deadline = null
      announce(entry)
      syncTimer(entry)
    }
  }

  function settle(): void {
    promote()
    warnWaiting()
    commit()
  }

  function findEntry(id: GhostToastId): ToastEntry | undefined {
    return entries.find((entry) => entry.id === id)
  }

  function hasTitle(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
  }

  function applyPatch(
    entry: ToastEntry,
    patch: GhostToastUpdateOptions,
    call: 'toast' | 'update',
  ): void {
    const previousDuration = entry.durationMs
    if ('title' in patch) {
      if (hasTitle(patch.title)) {
        entry.title = patch.title
      } else if (process.env.NODE_ENV !== 'production') {
        logGhostCode('GHOST011', { call: `${call}() title` })
      }
    }
    if (patch.type !== undefined) entry.type = patch.type
    if (patch.urgency !== undefined) entry.urgency = patch.urgency
    if ('description' in patch) entry.description = patch.description
    if ('action' in patch) entry.action = patch.action
    if ('onDismiss' in patch) entry.onDismiss = patch.onDismiss
    if ('duration' in patch) entry.durationOption = patch.duration
    validateDurationOption(entry, patch.duration)

    const nextDuration = resolveDuration(entry)
    if (nextDuration !== previousDuration) {
      // Recompute the budget from the new policy: a longer (or newly timed)
      // duration restarts the full interval; a shorter one keeps the elapsed
      // time and clamps to zero.
      stopTimer(entry)
      entry.durationMs = nextDuration
      if (nextDuration === null) {
        entry.remainingMs = null
      } else if (
        entry.state === 'queued' ||
        previousDuration === null ||
        nextDuration > previousDuration
      ) {
        entry.remainingMs = nextDuration
      } else {
        const elapsed = previousDuration - (entry.remainingMs ?? 0)
        entry.remainingMs = Math.max(0, nextDuration - elapsed)
      }
    }

    if (patch.announceUpdate === true && entry.state === 'visible') {
      announce(entry)
    }
    syncTimer(entry)
  }

  function toast(input: GhostToastOptions): GhostToastId {
    const explicitId = input.id
    if (
      explicitId !== undefined &&
      explicitId.startsWith(autoPrefix) &&
      process.env.NODE_ENV !== 'production'
    ) {
      logGhostCode('GHOST009', { id: explicitId, prefix: autoPrefix })
    }

    if (options.isServer) {
      if (process.env.NODE_ENV !== 'production') logGhostCode('GHOST006')
      return explicitId ?? `${autoPrefix}0`
    }

    if (explicitId !== undefined) {
      const existing = findEntry(explicitId)
      if (existing) {
        // T4: a reused id merges in place and keeps its slot and position.
        // `id` is ignored by applyPatch; every other field merges.
        applyPatch(existing, input, 'toast')
        commit()
        return explicitId
      }
      if (explicitId.startsWith(autoPrefix)) {
        // A masquerading id that matches no record would collide with a
        // future generated id, so it never creates a toast.
        return explicitId
      }
    }

    if (!hasTitle(input.title)) {
      if (process.env.NODE_ENV !== 'production')
        logGhostCode('GHOST011', { call: 'toast()' })
      return explicitId ?? `${autoPrefix}0`
    }
    if (disposed) return explicitId ?? `${autoPrefix}0`

    const id = explicitId ?? `${autoPrefix}${String((autoCounter += 1))}`
    const entry: ToastEntry = {
      id,
      state: 'queued',
      type: input.type ?? 'default',
      urgency: input.urgency ?? 'default',
      title: input.title,
      description: input.description,
      action: input.action,
      durationOption: input.duration,
      onDismiss: input.onDismiss,
      durationMs: null,
      remainingMs: null,
      deadline: null,
      timer: undefined,
      pauses: new Set(),
    }
    validateDurationOption(entry, input.duration)
    entry.durationMs = resolveDuration(entry)
    entry.remainingMs = entry.durationMs
    entries = [...entries, entry]
    settle()
    return id
  }

  function update(id: GhostToastId, patch: GhostToastUpdateOptions): void {
    const entry = findEntry(id)
    if (!entry) return
    applyPatch(entry, patch, 'update')
    commit()
  }

  function removeEntries(removed: ToastEntry[]): void {
    for (const entry of removed) {
      stopTimer(entry)
    }
    settle()
    // Callbacks run after the store settled so a callback that calls toast()
    // or dismiss() sees consistent state.
    for (const entry of removed) {
      entry.onDismiss?.()
    }
  }

  function dismiss(id: GhostToastId): void {
    const entry = findEntry(id)
    if (!entry) return
    entries = entries.filter((candidate) => candidate !== entry)
    removeEntries([entry])
  }

  function dismissAll(): void {
    const removed = entries
    entries = []
    removeEntries(removed)
  }

  function attachViewport(): () => void {
    viewportCount += 1
    settle()
    for (const entry of entries) syncTimer(entry)
    let attached = true
    return () => {
      if (!attached) return
      attached = false
      viewportCount -= 1
      for (const entry of entries) syncTimer(entry)
      commit()
    }
  }

  function setPaused(
    id: GhostToastId,
    reason: Exclude<GhostToastPauseReason, 'hidden'>,
    paused: boolean,
  ): void {
    const entry = findEntry(id)
    if (!entry) return
    if (paused === entry.pauses.has(reason)) return
    if (paused) entry.pauses.add(reason)
    else entry.pauses.delete(reason)
    syncTimer(entry)
    commit()
  }

  function setPageHidden(hidden: boolean): void {
    if (pageHidden === hidden) return
    pageHidden = hidden
    for (const entry of entries) syncTimer(entry)
    commit()
  }

  function refresh(): void {
    for (const entry of entries) {
      const next = resolveDuration(entry)
      if (next === entry.durationMs) continue
      applyPatch(entry, {}, 'update')
    }
    settle()
  }

  function dispose(): void {
    disposed = true
    viewportCount = 0
    dismissAll()
  }

  return {
    api: {
      toasts,
      toast,
      update,
      dismiss,
      dismissAll,
    },
    politeAnnouncement,
    assertiveAnnouncement,
    attachViewport,
    setPaused,
    setPageHidden,
    refresh,
    dispose,
  }
}

/**
 * Imperative toast API of the nearest {@link GhostToastProvider}. `options`
 * are defaults merged into every `toast()` call made through this instance.
 * The returned functions may be called outside `setup` (event handlers,
 * async callbacks).
 *
 * @throws When no `GhostToastProvider` is an ancestor.
 */
export function useGhostToast(
  options: UseGhostToastOptions = {},
): UseGhostToastReturn {
  const context = inject(ghostToastProviderContextKey, null)
  if (!context) {
    throw new Error(
      'useGhostToast must be used inside GhostToastProvider. Render GhostToastProvider (with a GhostToastViewport) above the component that calls useGhostToast().',
    )
  }
  const { api } = context
  return {
    toasts: api.toasts,
    toast: (input) => api.toast({ ...options, ...input }),
    update: api.update,
    dismiss: api.dismiss,
    dismissAll: api.dismissAll,
  }
}
