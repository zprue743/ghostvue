/** Default activation probe as a fraction of viewport height (see scroll-spy spec). */
export const SCROLL_SPY_DEFAULT_PROBE_OFFSET = 0.4

/** Scroll progress at or above which the final target is forced active. */
export const SCROLL_SPY_DEFAULT_END_THRESHOLD = 0.995

/** Scroll deltas below this are treated as sub-pixel noise. */
export const SCROLL_SPY_TRAVEL_MIN_DELTA = 0.5

/**
 * Resolves the probe line in viewport coordinates. Values in `(0, 1]` are a
 * fraction of `viewportHeight`; `0` or values `> 1` are a pixel offset.
 */
export function resolveScrollSpyProbeY(
  viewportHeight: number,
  probeOffset: number,
): number {
  if (probeOffset > 0 && probeOffset <= 1) {
    return viewportHeight * probeOffset
  }
  return probeOffset
}

/** Whether the scroll container has scrollable overflow. */
export function isScrollSpyScrollable(
  scrollHeight: number,
  viewportHeight: number,
): boolean {
  return scrollHeight - viewportHeight > 0
}

/** Normalized scroll progress in `[0, 1]`, or `0` when not scrollable. */
export function resolveScrollSpyProgress(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const distance = scrollHeight - viewportHeight
  if (distance <= 0) return 0
  return Math.min(1, Math.max(0, scrollTop / distance))
}

/**
 * Index of the active section. See {@link docs/components/scroll-spy-spec.md}.
 */
export function resolveScrollSpyActiveIndex(
  tops: readonly number[],
  viewportHeight: number,
  progress: number,
  probeOffset = SCROLL_SPY_DEFAULT_PROBE_OFFSET,
  endThreshold = SCROLL_SPY_DEFAULT_END_THRESHOLD,
): number {
  if (tops.length === 0) return 0
  if (progress >= endThreshold) return tops.length - 1
  const probe = resolveScrollSpyProbeY(viewportHeight, probeOffset)
  let active = 0
  tops.forEach((top, index) => {
    if (top <= probe) active = index
  })
  return active
}

/**
 * Interpolated marker progress for evenly spaced rails (`0..1`).
 * Matches the landing rail interpolation formerly in `resolveRailProgress`.
 */
export function resolveScrollSpySegmentProgress(
  tops: readonly number[],
  viewportHeight: number,
  scrollTop: number,
  progress: number,
  probeOffset = SCROLL_SPY_DEFAULT_PROBE_OFFSET,
): number {
  if (tops.length < 2) return progress
  const last = tops.length - 1
  const active = resolveScrollSpyActiveIndex(
    tops,
    viewportHeight,
    progress,
    probeOffset,
  )
  if (active >= last) return 1
  const probe = resolveScrollSpyProbeY(viewportHeight, probeOffset)
  const activation = (index: number): number =>
    index === 0 ? 0 : Math.max(0, (tops[index] ?? 0) + scrollTop - probe)
  const start = activation(active)
  const span = activation(active + 1) - start
  const within = span > 0 ? (scrollTop - start) / span : 0
  return (active + Math.min(1, Math.max(0, within))) / last
}

/** Direction of the last scroll movement, or `undefined` when idle / noise. */
export function resolveScrollSpyTravelDirection(
  previousScrollTop: number,
  scrollTop: number,
): 'down' | 'up' | undefined {
  const delta = scrollTop - previousScrollTop
  if (Math.abs(delta) < SCROLL_SPY_TRAVEL_MIN_DELTA) return undefined
  return delta > 0 ? 'down' : 'up'
}
