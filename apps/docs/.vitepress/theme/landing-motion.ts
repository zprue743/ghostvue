import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

import {
  isScrollSpyScrollable as isPageScrollable,
  resolveScrollSpyActiveIndex as resolveActiveSection,
  resolveScrollSpyProgress as resolveScrollProgress,
  resolveScrollSpySegmentProgress as resolveRailProgress,
  resolveScrollSpyTravelDirection as resolveTravelDirection,
  SCROLL_SPY_DEFAULT_PROBE_OFFSET as LANDING_ACTIVE_PROBE,
} from '../../../../packages/vue/src/scroll-spy-motion'

export {
  isPageScrollable,
  LANDING_ACTIVE_PROBE,
  resolveActiveSection,
  resolveRailProgress,
  resolveScrollProgress,
  resolveTravelDirection,
}

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

/**
 * Two-digit display number of the section at `index` (`01` for the first).
 * The rail markers and the background section number both print it, so the
 * two can never disagree about which number a section carries.
 */
export function landingSectionNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

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
  /** See {@link LandingMotionMode}. Stays `static` on the server. */
  motionMode: Ref<LandingMotionMode>
}

/**
 * Chooses how landing section intro/outro runs: CSS view timelines when
 * supported, otherwise `IntersectionObserver`, or `static` for reduced motion.
 *
 * Section rail position is owned by `GhostScrollSpy` on
 * `LandingSectionRail.vue`, not this helper.
 */
export function useLandingScroll(): LandingScrollState {
  const motionMode = ref<LandingMotionMode>('static')

  let observer: IntersectionObserver | undefined
  let motionQuery: MediaQueryList | undefined

  function sectionElements(): HTMLElement[] {
    return landingSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)
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
  })

  onBeforeUnmount(() => {
    motionQuery?.removeEventListener('change', syncMotionMode)
    stopObserver()
  })

  return { motionMode }
}
