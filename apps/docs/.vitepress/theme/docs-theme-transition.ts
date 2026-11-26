import { DOCS_THEME_STORAGE_KEY, type DocsThemeName } from './restore-theme'

/*
 * Animated theme and appearance changes for the docs chrome.
 *
 * `startThemeTransition` in `@ghostvue/themes` crossfades `data-ghost-mode`
 * only (ADR 0008 keeps it mode-only and tells callers to wrap the same View
 * Transitions pattern for anything else). The docs also switch the flagship
 * theme, and VitePress owns the appearance class, so the docs wrap the
 * pattern here instead of widening the public helper.
 *
 * A view transition is a crossfade of two snapshots of the page. That covers
 * what per-property transitions cannot tween (gradients, shadows, a change of
 * radius or density) and needs no transition declared on any component. The
 * crossfade's duration and easing come from the `::view-transition-*(root)`
 * rule in the themes recipe CSS, so they follow the active theme's motion
 * tokens.
 */

type ViewTransitionUpdate = () => void | Promise<void>

interface DocsViewTransition {
  ready: Promise<void>
  finished: Promise<void>
}

type DocsViewTransitionDocument = Document & {
  startViewTransition?: (update: ViewTransitionUpdate) => DocsViewTransition
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches
  )
}

/**
 * Runs `update` (a DOM write) inside a view transition so the page crossfades
 * from its old look to its new one. The update always runs exactly once.
 * Without the View Transitions API, or when the reader asked for reduced
 * motion, it runs immediately and nothing animates.
 */
export function runDocsViewTransition(update: ViewTransitionUpdate): void {
  const viewDocument = document as DocsViewTransitionDocument
  if (
    typeof viewDocument.startViewTransition !== 'function' ||
    prefersReducedMotion()
  ) {
    void update()
    return
  }
  const transition = viewDocument.startViewTransition(update)
  // Starting another transition before this one is ready skips this one and
  // rejects `ready`. That is the expected outcome of switching twice quickly
  // (the update still ran), not an error to surface in the console.
  transition.ready.catch(() => undefined)
}

/*
 * The theme the reader asked for most recently. A transition's update runs a
 * frame after it is requested, and a skipped transition still runs its
 * update. Every update therefore writes this value instead of the theme it
 * was created for, so two quick switches can never apply the older theme
 * last or flash it in between.
 */
let requestedTheme: DocsThemeName | undefined

/**
 * Switches the docs flagship theme: crossfades to it where the browser can,
 * and persists the choice for the next visit. Used by both the nav switcher
 * and the home page control so they cannot drift apart.
 *
 * First paint and the restore from storage do not go through here (see
 * `restoreDocsThemeScript`), so loading a page never animates.
 */
export function switchDocsTheme(next: DocsThemeName): void {
  requestedTheme = next
  try {
    localStorage.setItem(DOCS_THEME_STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies.
  }
  runDocsViewTransition(() => {
    if (!requestedTheme) return
    document.documentElement.setAttribute('data-ghost-theme', requestedTheme)
  })
}
