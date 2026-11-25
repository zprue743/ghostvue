import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Ordered landing sections. The page, the section rail, and the e2e spec all
 * read this list, so a section cannot exist without a rail marker.
 */
export const landingSections = [
  { id: 'hero', label: 'Overview' },
  { id: 'layers', label: 'Headless or themed' },
  { id: 'progression', label: 'Escape hatches' },
  { id: 'theming', label: 'Theming' },
  { id: 'components', label: 'Components' },
  { id: 'tooling', label: 'Agents and tooling' },
  { id: 'get-started', label: 'Get started' },
] as const

export type LandingSectionId = (typeof landingSections)[number]['id']

/** Where a section sits relative to the viewport band that counts as "in view". */
export type LandingSectionPhase = 'before' | 'active' | 'after'

/**
 * How section motion is driven. `static` is the server render, reduced
 * motion, and every case where nothing should be hidden. `timeline` means CSS
 * scroll-driven animations own the motion. `observer` is the
 * IntersectionObserver fallback for engines without `animation-timeline`.
 */
export type LandingMotionMode = 'static' | 'timeline' | 'observer'

/**
 * The reader is "on" the last section whose top edge has crossed this
 * fraction of the viewport height. Below the middle would switch too early
 * while the previous section still fills the screen.
 */
export const LANDING_ACTIVE_PROBE = 0.4

/** Scroll position at which the page counts as finished, for the last marker. */
const LANDING_END_THRESHOLD = 0.995

/**
 * Index of the active section given each section's top edge in viewport
 * coordinates. The first section stays active above the fold, and a page
 * scrolled to its end selects the last one even when that section is too
 * short for its top edge to reach the probe line.
 */
export function resolveActiveSection(
  tops: readonly number[],
  viewportHeight: number,
  progress: number,
): number {
  if (tops.length === 0) return 0
  if (progress >= LANDING_END_THRESHOLD) return tops.length - 1
  const probe = viewportHeight * LANDING_ACTIVE_PROBE
  let active = 0
  tops.forEach((top, index) => {
    if (top <= probe) active = index
  })
  return active
}

/** Fraction of the scrollable distance already covered, clamped to 0..1. */
export function resolveScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const distance = scrollHeight - viewportHeight
  if (distance <= 0) return 0
  return Math.min(1, Math.max(0, scrollTop / distance))
}

/**
 * Position of the rail's traveller, 0..1, where `index / (count - 1)` is the
 * marker of section `index`. Sections differ in height, so raw page progress
 * would drift away from the evenly spaced markers; this interpolates between
 * the scroll positions at which neighbouring sections become active instead.
 */
export function resolveRailProgress(
  tops: readonly number[],
  viewportHeight: number,
  scrollTop: number,
  progress: number,
): number {
  if (tops.length < 2) return progress
  const last = tops.length - 1
  const active = resolveActiveSection(tops, viewportHeight, progress)
  if (active >= last) return 1
  const probe = viewportHeight * LANDING_ACTIVE_PROBE
  // Scroll offset at which a section's top edge reaches the probe line. The
  // first section is active from the very top of the page.
  const activation = (index: number): number =>
    index === 0 ? 0 : Math.max(0, (tops[index] ?? 0) + scrollTop - probe)
  const start = activation(active)
  const span = activation(active + 1) - start
  const within = span > 0 ? (scrollTop - start) / span : 0
  return (active + Math.min(1, Math.max(0, within))) / last
}

/**
 * Fallback phase for one observed section. A section that is not intersecting
 * the observed band is either still below it (intro pending) or already above
 * it (outro played), which is what lets the motion reverse on the way back.
 */
export function resolveSectionPhase(
  isIntersecting: boolean,
  sectionTop: number,
  bandTop: number,
): LandingSectionPhase {
  if (isIntersecting) return 'active'
  return sectionTop > bandTop ? 'before' : 'after'
}

function supportsViewTimeline(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: view()')
  )
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Shrinks the observed band so a section must be well inside to count. */
const OBSERVER_ROOT_MARGIN = '-18% 0px -18% 0px'

export interface LandingScrollState {
  /** Section the reader is on; the first one until the client has measured. */
  activeId: Ref<LandingSectionId>
  /** See {@link LandingMotionMode}. Stays `static` on the server. */
  motionMode: Ref<LandingMotionMode>
}

/**
 * Tracks the active section and page progress for the rail, and drives the
 * fallback intro/outro phases where CSS scroll-driven animations are missing.
 *
 * It only ever reads scroll position. Nothing here calls `preventDefault`,
 * snaps, or scrolls on the reader's behalf, so wheel, touch, and keyboard
 * scrolling stay native.
 */
export function useLandingScroll(
  root: Ref<HTMLElement | null>,
): LandingScrollState {
  const activeId = ref<LandingSectionId>(landingSections[0].id)
  const motionMode = ref<LandingMotionMode>('static')

  let frame = 0
  let observer: IntersectionObserver | undefined
  let motionQuery: MediaQueryList | undefined

  function sectionElements(): HTMLElement[] {
    return landingSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)
  }

  function measure(): void {
    frame = 0
    const host = root.value
    if (!host) return
    const viewportHeight = window.innerHeight
    const progress = resolveScrollProgress(
      window.scrollY,
      document.documentElement.scrollHeight,
      viewportHeight,
    )
    const tops = sectionElements().map(
      (element) => element.getBoundingClientRect().top,
    )
    // Written straight to the element: a reactive write per scroll frame
    // would re-render the rail for a value only CSS consumes.
    host.style.setProperty(
      '--ghost-landing-progress',
      resolveRailProgress(
        tops,
        viewportHeight,
        window.scrollY,
        progress,
      ).toFixed(4),
    )
    const index = resolveActiveSection(tops, viewportHeight, progress)
    const next = landingSections[index]
    if (next && next.id !== activeId.value) activeId.value = next.id
  }

  function scheduleMeasure(): void {
    if (frame !== 0) return
    frame = requestAnimationFrame(measure)
  }

  function stopObserver(): void {
    observer?.disconnect()
    observer = undefined
    for (const element of sectionElements()) {
      element.removeAttribute('data-landing-phase')
    }
  }

  function startObserver(): void {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const bandTop = entry.rootBounds?.top ?? 0
          entry.target.setAttribute(
            'data-landing-phase',
            resolveSectionPhase(
              entry.isIntersecting,
              entry.boundingClientRect.top,
              bandTop,
            ),
          )
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN },
    )
    for (const element of sectionElements()) observer.observe(element)
  }

  function syncMotionMode(): void {
    stopObserver()
    if (motionQuery?.matches) {
      motionMode.value = 'static'
    } else if (supportsViewTimeline()) {
      motionMode.value = 'timeline'
    } else if (typeof IntersectionObserver === 'function') {
      motionMode.value = 'observer'
      startObserver()
    } else {
      motionMode.value = 'static'
    }
  }

  onMounted(() => {
    motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    motionQuery.addEventListener('change', syncMotionMode)
    syncMotionMode()
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    measure()
  })

  onBeforeUnmount(() => {
    motionQuery?.removeEventListener('change', syncMotionMode)
    window.removeEventListener('scroll', scheduleMeasure)
    window.removeEventListener('resize', scheduleMeasure)
    if (frame !== 0) cancelAnimationFrame(frame)
    stopObserver()
  })

  return { activeId, motionMode }
}
